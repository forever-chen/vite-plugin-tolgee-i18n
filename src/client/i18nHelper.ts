/**
 * i18n 高级辅助函数
 *
 * 封装了 vue-i18n 实例的创建和语言切换逻辑，
 * 自动集成 Tolgee 运行时翻译合并，简化消费方代码。
 */
import type { App } from 'vue';
import type { I18n, I18nOptions } from 'vue-i18n';
import { createI18n } from 'vue-i18n';
import { fetchTolgeeTranslations, mergeTranslations } from './tolgee';

/** createI18nWithTolgee 的配置项 */
export interface CreateI18nOptions {
    /** Tolgee API 地址 */
    apiUrl: string;
    /** Tolgee API Key */
    apiKey: string;
    /** 初始语言 (如 'zh-CN', 'en') */
    locale: string;
    /** 本地翻译消息对象 (从 locale 文件 import 得到) */
    messages: Record<string, any>;
    /** 是否启用运行时 Tolgee 翻译合并 (通常仅开发模式开启) */
    enableRuntimeMerge?: boolean;
    /** vue-i18n 缺失翻译回调 */
    missing?: I18nOptions['missing'];
}

/**
 * 创建带 Tolgee 集成的 i18n 实例
 *
 * 1. 如果 enableRuntimeMerge 为 true，先拉取 Tolgee 翻译并合并
 * 2. 创建 vue-i18n 实例
 * 3. 自动调用 app.use(i18n) 注册
 *
 * @example
 * ```ts
 * const i18n = await createI18nWithTolgee(app, {
 *     apiUrl: import.meta.env.VITE_APP_TOLGEE_API_URL,
 *     apiKey: import.meta.env.VITE_TOGGLE_SECRET,
 *     locale: 'zh-CN',
 *     messages: zhCNMessages,
 *     enableRuntimeMerge: import.meta.env.DEV,
 * });
 * ```
 */
export async function createI18nWithTolgee(app: App, options: CreateI18nOptions): Promise<I18n> {
    let message = options.messages;

    if (options.enableRuntimeMerge) {
        const overrides = await fetchTolgeeTranslations(options.apiUrl, options.apiKey, options.locale);
        if (overrides) {
            message = mergeTranslations(message, overrides);
        }
    }

    const i18n = createI18n({
        legacy: false,
        locale: options.locale,
        messages: { [options.locale]: message },
        missing: options.missing || ((locale, key) => key),
    });

    app.use(i18n);
    return i18n;
}

/**
 * 切换语言并同步 Tolgee 翻译
 *
 * @param i18n     vue-i18n 实例
 * @param locale   目标语言
 * @param messages 本地翻译消息对象
 * @param options  Tolgee 配置
 *
 * @example
 * ```ts
 * await switchLocaleWithTolgee(i18n, 'en', enMessages, {
 *     apiUrl: '...',
 *     apiKey: '...',
 *     enableRuntimeMerge: true,
 * });
 * ```
 */
export async function switchLocaleWithTolgee(
    i18n: I18n,
    locale: string,
    messages: Record<string, any>,
    options: { apiUrl: string; apiKey: string; enableRuntimeMerge?: boolean }
): Promise<void> {
    let merged = messages;

    if (options.enableRuntimeMerge) {
        const overrides = await fetchTolgeeTranslations(options.apiUrl, options.apiKey, locale);
        if (overrides) {
            merged = mergeTranslations(messages, overrides);
        }
    }

    const global = i18n.global as any;
    global.setLocaleMessage(locale, merged);
    global.locale.value = locale;
}
