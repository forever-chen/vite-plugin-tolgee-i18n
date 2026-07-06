/**
 * 统一入口 — 导出插件和客户端所有公开 API
 *
 * Vite 构建侧 (node):
 *   - tolgeePlugin: Vite 插件函数
 *
 * 客户端侧 (browser):
 *   - setupI18nInspector: 挂载 Inspector 开发工具
 *   - createI18nWithTolgee: 创建 i18n 实例 (含 Tolgee 运行时合并)
 *   - switchLocaleWithTolgee: 切换语言 (含 Tolgee 运行时合并)
 *   - fetchTolgeeTranslations: 运行时拉取 Tolgee 翻译
 *   - mergeTranslations: 深度合并翻译
 */
export type { TolgeePluginOptions, InspectorOptions, InspectorStyleOptions, InspectorTheme, InspectorLocale } from './types';
export type { InspectorSetupOptions, LocaleLoader } from './client/inspector';
export type { CreateI18nOptions } from './client/i18nHelper';
export { default as tolgeePlugin } from './plugin';
export { fetchTolgeeTranslations, mergeTranslations } from './client/tolgee';
export { createI18nWithTolgee, switchLocaleWithTolgee } from './client/i18nHelper';
