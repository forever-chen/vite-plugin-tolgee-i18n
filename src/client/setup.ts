/**
 * Inspector 挂载入口
 *
 * 负责将 I18nInspector 组件渲染到 DOM 中，
 * 通过 Vue provide/inject 将 i18n 实例、样式配置、API 配置传递给组件。
 *
 * 使用 Wrapper 组件模式提供值，确保 provide 在组件 setup 中原生生效，
 * 而非依赖 app.provide + appContext 传递。
 */
import { createVNode, render, defineComponent, h, provide } from 'vue';
import type { App } from 'vue';
import type { I18n } from 'vue-i18n';
import type { InspectorStyleOptions, InspectorTheme, InspectorLocale } from '../types';
import I18nInspector from './I18nInspector.vue';

/** provide key: i18n 实例 */
export const I18N_INSPECTOR_KEY = '__tolgee_i18n_inspector_instance__';
/** provide key: 样式配置 */
export const I18N_INSPECTOR_STYLE_KEY = '__tolgee_i18n_inspector_style__';
/** provide key: Tolgee API 配置 */
export const I18N_INSPECTOR_API_KEY = '__tolgee_i18n_inspector_api__';
/** provide key: locale 加载器 */
export const I18N_INSPECTOR_LOCALE_LOADER_KEY = '__tolgee_i18n_inspector_locale_loader__';
/** provide key: 主题 */
export const I18N_INSPECTOR_THEME_KEY = '__tolgee_i18n_inspector_theme__';
/** provide key: 界面语言 */
export const I18N_INSPECTOR_UI_LOCALE_KEY = '__tolgee_i18n_inspector_ui_locale__';

/** locale 加载函数类型: 传入语言标识，返回消息对象 */
export type LocaleLoader = (lang: string) => Promise<Record<string, any>>;

/** setupI18nInspector 的配置项 */
export interface InspectorSetupOptions {
    /** Tolgee API 地址 */
    apiUrl: string;
    /** Tolgee API Key (同时用作 Inspector 验证码) */
    apiKey: string;
    /** Inspector UI 样式覆盖 */
    style?: InspectorStyleOptions;
    /**
     * Inspector 主题
     * @default 'dark'
     */
    theme?: InspectorTheme;
    /**
     * Inspector 界面语言
     * @default 'zh-CN'
     */
    locale?: InspectorLocale;
    /**
     * locale 加载函数
     * Inspector 需要同时读取中英文翻译，但项目可能按需加载只有当前语言。
     * 提供此函数以便 Inspector 加载缺失的语言包。
     *
     * @example
     * ```ts
     * localeLoader: (lang) => import(`./locales/${lang}.ts`).then(m => m.default)
     * ```
     */
    localeLoader?: LocaleLoader;
}

/**
 * 挂载 I18n Inspector 开发工具
 *
 * 在 body 末尾创建独立的 DOM 容器并渲染 Inspector 组件。
 * 仅在开发模式下调用。
 *
 * @param app     Vue 应用实例
 * @param i18n    vue-i18n 实例
 * @param options Inspector 配置
 *
 * @example
 * ```ts
 * if (import.meta.env.DEV) {
 *     setupI18nInspector(app, i18n, {
 *         apiUrl: import.meta.env.VITE_APP_TOLGEE_API_URL,
 *         apiKey: import.meta.env.VITE_TOGGLE_SECRET,
 *         theme: 'dark',
 *         locale: 'zh-CN',
 *         localeLoader: (lang) => import(`./locales/${lang}.ts`).then(m => m.default),
 *     });
 * }
 * ```
 */
export function setupI18nInspector(app: App, i18n: I18n, options: InspectorSetupOptions) {
    const container = document.createElement('div');
    container.id = 'tolgee-i18n-inspector-container';
    document.body.appendChild(container);

    const Wrapper = defineComponent({
        name: 'I18nInspectorWrapper',
        setup() {
            provide(I18N_INSPECTOR_KEY, i18n);
            provide(I18N_INSPECTOR_STYLE_KEY, options.style || {});
            provide(I18N_INSPECTOR_API_KEY, { apiUrl: options.apiUrl, apiKey: options.apiKey });
            provide(I18N_INSPECTOR_LOCALE_LOADER_KEY, options.localeLoader || null);
            provide(I18N_INSPECTOR_THEME_KEY, options.theme || 'dark');
            provide(I18N_INSPECTOR_UI_LOCALE_KEY, options.locale || 'zh-CN');
            return () => h(I18nInspector);
        },
    });

    const vnode = createVNode(Wrapper);
    vnode.appContext = app._context;
    render(vnode, container);
}
