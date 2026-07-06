/**
 * Tolgee 运行时翻译工具
 *
 * 在开发模式下，从 Tolgee 服务端实时拉取翻译并合并到 i18n 消息中，
 * 实现 "改即见" 的翻译预览体验。
 */

/**
 * 从 Tolgee 拉取指定语言的全量翻译 (运行时)
 *
 * @param apiUrl  Tolgee API 基础地址
 * @param apiKey  Tolgee API Key
 * @param lang    目标语言 (支持 'zh-CN', 'en' 等格式，内部自动映射为 Tolgee 的 'zh'/'en')
 * @returns 扁平 key-value 翻译对象，无数据时返回 null
 */
export async function fetchTolgeeTranslations(apiUrl: string, apiKey: string, lang: string): Promise<Record<string, string> | null> {
    if (!apiUrl || !apiKey) return null;
    const tolgeLang = lang === 'zh-CN' ? 'zh' : 'en';
    try {
        const params = new URLSearchParams({ languages: tolgeLang, size: '10000' });
        const res = await fetch(`${apiUrl}/v2/projects/translations?${params}`, {
            headers: { 'X-API-Key': apiKey },
        });
        if (!res.ok) return null;
        const data = await res.json();
        const result: Record<string, string> = {};
        if (data?._embedded?.keys) {
            for (const item of data._embedded.keys) {
                const keyName = item.keyName;
                const text = item.translations?.[tolgeLang]?.text;
                if (keyName && text) result[keyName] = text;
            }
        }
        return Object.keys(result).length > 0 ? result : null;
    } catch {
        return null;
    }
}

/**
 * 将 Tolgee 扁平翻译深度合并到已有的嵌套消息对象中
 *
 * @param baseMessages  原始嵌套消息对象 (如从 locale 文件加载的)
 * @param flatOverrides Tolgee 返回的扁平 key-value 覆盖
 * @returns 合并后的嵌套消息对象
 *
 * @example
 * ```ts
 * const base = { nav: { home: '首页' } };
 * const overrides = { 'nav.home': 'Home Page' };
 * mergeTranslations(base, overrides);
 * // => { nav: { home: 'Home Page' } }
 * ```
 */
export function mergeTranslations(baseMessages: Record<string, any>, flatOverrides: Record<string, string>): Record<string, any> {
    const result = JSON.parse(JSON.stringify(baseMessages));
    for (const [flatKey, value] of Object.entries(flatOverrides)) {
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
