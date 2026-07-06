/**
 * vite-plugin-tolgee — Vite 构建时翻译注入插件
 *
 * 在构建启动阶段从 Tolgee 服务端拉取全量翻译，
 * 然后在 transform 阶段拦截 locale 文件并注入 deep-merge 逻辑，
 * 使打包产物自动包含最新的 Tolgee 翻译覆盖，无需修改源文件。
 *
 * syncToCache 模式:
 * 开启后每次 transform 请求 locale 文件时会重新拉取 Tolgee 最新数据，
 * 并同步写入 src/locales/.cache/ 供本地查阅（不进入 git）。
 * 使用 2s 去重避免快速刷新重复请求。
 */
import type { Plugin } from 'vite';
import type { TolgeePluginOptions } from './types';

/**
 * 分页拉取 Tolgee 翻译 (构建时使用)
 * @param apiUrl  Tolgee API 基础地址
 * @param apiKey  Tolgee API Key
 * @param lang    语言标识 (如 'zh', 'en')
 * @returns 扁平化的 key-value 翻译对象
 */
async function fetchAllTranslations(apiUrl: string, apiKey: string, lang: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    let page = 0;
    const size = 1000;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({ languages: lang, size: String(size), page: String(page) });
        const res = await fetch(`${apiUrl}/v2/projects/translations?${params}`, {
            headers: { 'X-API-Key': apiKey },
        });
        if (!res.ok) break;
        const data = await res.json();
        const keys = data?._embedded?.keys;
        if (!keys || keys.length === 0) break;
        for (const item of keys) {
            const keyName = item.keyName;
            const text = item.translations?.[lang]?.text;
            if (keyName && text) result[keyName] = text;
        }
        hasMore = keys.length === size;
        page++;
    }

    return result;
}

/**
 * 将扁平的 dot-notation key-value 还原为嵌套对象
 * 例: { 'a.b.c': 'hello' } => { a: { b: { c: 'hello' } } }
 */
function unflatten(flat: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [flatKey, value] of Object.entries(flat)) {
        const parts = flatKey.split('.');
        let cur = result;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
    }
    return result;
}

/**
 * 生成注入到 locale 文件中的 deep-merge 运行时代码
 * 包含 __deepMerge__ 函数和 __tolgee_overrides__ 常量
 */
function generateMergeCode(overrides: Record<string, string>): string {
    const nestedOverrides = unflatten(overrides);
    return `
function __deepMerge__(base, override) {
    const result = { ...base };
    for (const key of Object.keys(override)) {
        if (typeof override[key] === 'object' && override[key] !== null && typeof result[key] === 'object' && result[key] !== null) {
            result[key] = __deepMerge__(result[key], override[key]);
        } else {
            result[key] = override[key];
        }
    }
    return result;
}
const __tolgee_overrides__ = ${JSON.stringify(nestedOverrides)};
`;
}

/**
 * 对 locale 源码进行 AST-free 转换:
 * 1. 将 `export default` 改为 `const __base__ =`
 * 2. 末尾追加 `export default __deepMerge__(__base__, __tolgee_overrides__)`
 */
function transformCode(code: string, overrides: Record<string, string>): string {
    return code
        .replace(/export\s+default\s+/, `${generateMergeCode(overrides)}\nconst __base__ = `)
        .replace(/;\s*$/, ';\nexport default __deepMerge__(__base__, __tolgee_overrides__);\n');
}

function getCacheFileName(lang: string): string {
    return lang === 'zh' ? 'zh-CN.json' : 'en.json';
}

/**
 * 原子写入 .cache 文件: 先写 .tmp 再 rename，避免 transform 读到半写文件
 */
async function writeCacheFiles(cacheDir: string, data: Record<string, Record<string, string>>): Promise<void> {
    if (Object.keys(data).length === 0) return;
    try {
        const { writeFileSync, renameSync, mkdirSync } = await import('fs');
        const { resolve } = await import('path');
        mkdirSync(cacheDir, { recursive: true });
        for (const [lang, entries] of Object.entries(data)) {
            const filePath = resolve(cacheDir, getCacheFileName(lang));
            const tmpPath = filePath + '.tmp';
            writeFileSync(tmpPath, JSON.stringify(entries, null, 2), 'utf-8');
            renameSync(tmpPath, filePath);
        }
    } catch {
        // 不在 Node.js 环境时静默跳过（浏览器 import('fs') 会失败）
    }
}

/**
 * 创建 Tolgee Vite 插件
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import tolgeePlugin from 'vite-plugin-tolgee-i18n/plugin';
 *
 * export default defineConfig({
 *     plugins: [
 *         tolgeePlugin({
 *             apiUrl: 'https://tolgee.your-domain.com',
 *             apiKey: 'your-api-key',
 *         }),
 *     ],
 * });
 * ```
 */
export default function tolgeePlugin(options: TolgeePluginOptions): Plugin {
    let translations: Record<string, Record<string, string>> = {};
    let enabled = false;
    let isDevServer = false;

    const { syncToCache } = options;

    // 默认 locale 文件路径映射，可通过 options.locales 覆盖
    const localePatterns = options.locales || {
        zh: 'locales/zh-CN.ts',
        en: 'locales/en.ts',
    };

    // syncToCache 专用状态
    const FETCH_DEBOUNCE_MS = 2000;
    let fetchPromise: Promise<void> | null = null;
    let fetchTime = 0;

    function getCacheDir(): string {
        return process.cwd() + '/src/locales/.cache';
    }

    /**
     * 带 2s 去重的 Tolgee 刷新:
     * - 同一刷新周期内多个 transform 请求共享同一份 fetch
     * - 2s 后自动过期，下次请求触发新 fetch
     * - 失败时静默处理，复用旧数据
     */
    async function refreshTranslations(apiUrl: string, apiKey: string): Promise<void> {
        const now = Date.now();
        if (fetchPromise && now - fetchTime < FETCH_DEBOUNCE_MS) {
            return fetchPromise;
        }
        fetchTime = now;
        fetchPromise = (async () => {
            try {
                const langs = Object.keys(localePatterns);
                const results = await Promise.all(langs.map(lang => fetchAllTranslations(apiUrl, apiKey, lang)));
                for (let i = 0; i < langs.length; i++) {
                    translations[langs[i]] = results[i];
                }
            } catch (e: any) {
                console.warn('[vite-plugin-tolgee] Refresh failed:', e.message);
                return;
            }
            try {
                await writeCacheFiles(getCacheDir(), translations);
            } catch (e: any) {
                console.warn('[vite-plugin-tolgee] Cache write failed:', e.message);
            }
        })();
        return fetchPromise;
    }

    /** 判断模块 ID 是否匹配某个 locale 文件，返回对应的语言标识 */
    function isLocaleId(id: string): string | null {
        const cleanId = id.split('?')[0];
        for (const [lang, pattern] of Object.entries(localePatterns)) {
            if (cleanId.endsWith(pattern)) return lang;
        }
        return null;
    }

    return {
        name: 'vite-plugin-tolgee',
        enforce: 'pre',

        /** 构建启动时拉取 Tolgee 翻译 */
        async buildStart() {
            if (!options.apiKey || !options.apiUrl) return;
            enabled = true;
            console.log('[vite-plugin-tolgee] Fetching translations from Tolgee...');
            try {
                const langs = Object.keys(localePatterns);
                const results = await Promise.all(langs.map(lang => fetchAllTranslations(options.apiUrl, options.apiKey, lang)));
                for (let i = 0; i < langs.length; i++) {
                    translations[langs[i]] = results[i];
                }
                if (syncToCache) {
                    try {
                        await writeCacheFiles(getCacheDir(), translations);
                    } catch (e: any) {
                        console.warn('[vite-plugin-tolgee] Cache write failed:', e.message);
                    }
                }
                const summary = langs.map(l => `${Object.keys(translations[l]).length} ${l} keys`).join(', ');
                console.log(`[vite-plugin-tolgee] Fetched ${summary}`);
            } catch (e: any) {
                console.warn('[vite-plugin-tolgee] Failed to fetch translations:', e.message);
                enabled = false;
            }
        },

        configureServer(server) {
            isDevServer = true;
            if (!syncToCache) return;
            server.middlewares.use(async (req, res, next) => {
                const reqUrl = (req.url || '').split('?')[0];
                let matchedLang: string | null = null;
                let matchedPattern: string | null = null;
                for (const [lang, pattern] of Object.entries(localePatterns)) {
                    if (reqUrl.endsWith(pattern)) {
                        matchedLang = lang;
                        matchedPattern = pattern;
                        break;
                    }
                }
                if (!matchedLang || !matchedPattern) return next();

                try {
                    const { readFileSync } = await import('fs');
                    const { resolve } = await import('path');
                    const filePath = resolve(process.cwd(), 'src', matchedPattern);
                    const sourceCode = readFileSync(filePath, 'utf-8');

                    await refreshTranslations(options.apiUrl, options.apiKey);

                    const overrides = translations[matchedLang];
                    if (overrides && Object.keys(overrides).length > 0) {
                        const mergedCode = transformCode(sourceCode, overrides);
                        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                        res.statusCode = 200;
                        res.end(mergedCode);
                        return;
                    }
                } catch (e: any) {
                    console.warn('[vite-plugin-tolgee] Serve bypass failed:', e.message);
                }

                next();
            });
        },

        /** 拦截 locale 文件，注入 Tolgee 翻译覆盖 */
        transform(code, id) {
            if (isDevServer && syncToCache) return null;
            if (!enabled) return null;
            const lang = isLocaleId(id);
            if (!lang) return null;
            const overrides = translations[lang];
            if (!overrides || Object.keys(overrides).length === 0) return null;
            return { code: transformCode(code, overrides), map: null };
        },
    };
}
