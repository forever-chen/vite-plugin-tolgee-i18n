import { writeFileSync } from 'fs';
import { resolve } from 'path';

const dir = resolve(import.meta.dirname, '../dist/client');

writeFileSync(
    resolve(dir, 'setup.js'),
    [
        `export {`,
        `  I18N_INSPECTOR_KEY,`,
        `  I18N_INSPECTOR_STYLE_KEY,`,
        `  I18N_INSPECTOR_API_KEY,`,
        `  I18N_INSPECTOR_LOCALE_LOADER_KEY,`,
        `  I18N_INSPECTOR_THEME_KEY,`,
        `  I18N_INSPECTOR_UI_LOCALE_KEY,`,
        `  setupI18nInspector`,
        `} from './index.js';`,
        ``,
    ].join('\n'),
    'utf-8'
);

writeFileSync(
    resolve(dir, 'setup.d.ts'),
    [
        `export {`,
        `  I18N_INSPECTOR_KEY,`,
        `  I18N_INSPECTOR_STYLE_KEY,`,
        `  I18N_INSPECTOR_API_KEY,`,
        `  I18N_INSPECTOR_LOCALE_LOADER_KEY,`,
        `  I18N_INSPECTOR_THEME_KEY,`,
        `  I18N_INSPECTOR_UI_LOCALE_KEY,`,
        `  setupI18nInspector,`,
        `} from './index';`,
        `export type LocaleLoader = (lang: string) => Promise<Record<string, any>>;`,
        `export type InspectorSetupOptions = {`,
        `  apiUrl: string;`,
        `  apiKey: string;`,
        `  locale?: string;`,
        `  localeLoader?: LocaleLoader;`,
        `  theme?: string;`,
        `  style?: Record<string, any>;`,
        `};`,
        ``,
    ].join('\n'),
    'utf-8'
);

writeFileSync(
    resolve(dir, 'auth.js'),
    [`export {`, `  getAuthStatus,`, `  getStoredKey,`, `  verifyKey,`, `  verifyStoredKey,`, `  clearAuth,`, `} from './index.js';`, ``].join('\n'),
    'utf-8'
);

writeFileSync(
    resolve(dir, 'auth.d.ts'),
    [`export {`, `  getAuthStatus,`, `  getStoredKey,`, `  verifyKey,`, `  verifyStoredKey,`, `  clearAuth,`, `} from './index';`, ``].join('\n'),
    'utf-8'
);
