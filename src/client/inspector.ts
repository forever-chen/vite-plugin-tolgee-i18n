/**
 * Inspector 客户端入口
 *
 * 统一导出 Inspector 相关的公开 API。
 */
export { setupI18nInspector, I18N_INSPECTOR_KEY, I18N_INSPECTOR_STYLE_KEY, I18N_INSPECTOR_API_KEY } from './setup';
export type { InspectorSetupOptions, LocaleLoader } from './setup';
export { getAuthStatus, getStoredKey, verifyKey, verifyStoredKey, clearAuth } from './auth';
