# vite-plugin-tolgee-i18n

**[中文](./README.zh.md)** | **[English](./README.md)**

[![npm version](https://img.shields.io/npm/v/vite-plugin-tolgee-i18n)](https://www.npmjs.com/package/vite-plugin-tolgee-i18n)
[![Vue](https://img.shields.io/badge/Vue-3.3+-4fc08d)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-4+-646cff)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> 一体化的 Vue 3 + Tolgee 国际化解决方案，团队协作翻译零冲突。

> ⚠️ **Vue 3 Only** — 本插件当前仅支持 Vue 3（依赖 `vue >=3.3` 和 `vue-i18n >=9`）。React 和 Vue 2 支持已在计划中。

## 安装

```bash
pnpm add vite-plugin-tolgee-i18n -D
```

Requires: Vue >=3.3, vue-i18n >=9, Vite >=4

## 快速开始

### 注册插件

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { tolgeePlugin } from 'vite-plugin-tolgee-i18n';
import process from 'node:process';

export default defineConfig({
    plugins: [
        tolgeePlugin({
            apiUrl: process.env.TOLGEE_API_URL,
            apiKey: process.env.TOLGEE_API_KEY,
            locales: {
                zh: 'locales/zh-CN.ts',
                en: 'locales/en.ts',
            },
            syncToCache: true,
        }),
    ],
});
```

> `syncToCache: true` 将远程翻译写入 `.cache/`（gitignored），源文件永不修改，多人协作零冲突。

### 创建 i18n 实例

```ts
// main.ts
import { createApp } from 'vue';
import { createI18nWithTolgee } from 'vite-plugin-tolgee-i18n';
import { setupI18nInspector } from 'vite-plugin-tolgee-i18n/client';
import zhCN from './locales/zh-CN';
import App from './App.vue';

const app = createApp(App);

const i18n = await createI18nWithTolgee(app, {
    apiUrl: import.meta.env.VITE_APP_TOLGEE_API_URL,
    apiKey: import.meta.env.VITE_TOGGLE_SECRET,
    locale: 'zh-CN',
    messages: zhCN,
    enableRuntimeMerge: import.meta.env.DEV,
});

if (import.meta.env.DEV) {
    setupI18nInspector(app, i18n, {
        apiUrl: import.meta.env.VITE_APP_TOLGEE_API_URL,
        apiKey: import.meta.env.VITE_TOGGLE_SECRET,
        theme: 'dark',
        locale: 'zh-CN',
        localeLoader: lang => import(`./locales/${lang}.ts`).then(m => m.default),
    });
}

app.mount('#app');
```

### 切换语言

```ts
import { switchLocaleWithTolgee } from 'vite-plugin-tolgee-i18n';

async function changeLocale(locale: string) {
    const langModule = await import(`./locales/${locale}.ts`);
    await switchLocaleWithTolgee(i18n, locale, langModule.default, {
        apiUrl: import.meta.env.VITE_APP_TOLGEE_API_URL,
        apiKey: import.meta.env.VITE_TOGGLE_SECRET,
        enableRuntimeMerge: import.meta.env.DEV,
    });
}
```

## 使用流程

1. 页面右下角点击「文」按钮进入编辑模式
   ![点击按钮](./assets/button.png)
   ![输入toggle secret](./assets/toggleKey.png)
2. 按住 **Alt** 悬停文案 → 查看 i18n key 和中英文翻译
   ![修改文案](./assets/changeWords.png)
3. 按住 **Alt** 点击文案 → 弹出编辑框，修改后保存 → 即时推送到 Tolgee
4. 刷新页面，Tolgee 新翻译自动生效

## API 参考

### Vite 插件

| 参数          | 类型                     | 必填 | 默认值                                            | 说明                                      |
| ------------- | ------------------------ | ---- | ------------------------------------------------- | ----------------------------------------- |
| `apiUrl`      | `string`                 | ✅   | -                                                 | Tolgee API 地址                           |
| `apiKey`      | `string`                 | ✅   | -                                                 | Tolgee API Key                            |
| `locales`     | `Record<string, string>` | ❌   | `{ zh: 'locales/zh-CN.ts', en: 'locales/en.ts' }` | locale 文件路径映射                       |
| `syncToCache` | `boolean`                | ❌   | `false`                                           | 启用时同步 Tolgee 到 `.cache/` 并实时合并 |

### 客户端 API

| 导出                                                      | 导入路径                         | 说明                           |
| --------------------------------------------------------- | -------------------------------- | ------------------------------ |
| `setupI18nInspector(app, i18n, options)`                  | `vite-plugin-tolgee-i18n/client` | 挂载 Inspector 开发工具        |
| `createI18nWithTolgee(app, options)`                      | `vite-plugin-tolgee-i18n`        | 创建含 Tolgee 集成的 i18n 实例 |
| `switchLocaleWithTolgee(i18n, locale, messages, options)` | `vite-plugin-tolgee-i18n`        | 切换语言并合并 Tolgee 翻译     |
| `fetchTolgeeTranslations(apiUrl, apiKey, lang)`           | `vite-plugin-tolgee-i18n`        | 拉取 Tolgee 翻译               |
| `mergeTranslations(base, overrides)`                      | `vite-plugin-tolgee-i18n`        | 深度合并翻译                   |

### InspectorSetupOptions

| 参数           | 类型                                     | 必填 | 默认值    | 说明               |
| -------------- | ---------------------------------------- | ---- | --------- | ------------------ |
| `apiUrl`       | `string`                                 | ✅   | -         | Tolgee API 地址    |
| `apiKey`       | `string`                                 | ✅   | -         | Tolgee API Key     |
| `theme`        | `'dark' \| 'light'`                      | ❌   | `'dark'`  | Inspector 主题     |
| `locale`       | `'zh-CN' \| 'en'`                        | ❌   | `'zh-CN'` | Inspector 界面语言 |
| `style`        | `InspectorStyleOptions`                  | ❌   | -         | UI 样式覆盖        |
| `localeLoader` | `(lang) => Promise<Record<string, any>>` | ❌   | -         | 语言包加载函数     |

### 类型导出

```ts
import type {
    TolgeePluginOptions,
    InspectorOptions,
    InspectorStyleOptions,
    InspectorTheme,
    InspectorLocale,
    InspectorSetupOptions,
    LocaleLoader,
    CreateI18nOptions,
} from 'vite-plugin-tolgee-i18n';
```

## 环境变量

```env
VITE_APP_TOLGEE_API_URL=https://tolgee.your-domain.com
VITE_TOGGLE_SECRET=your-project-api-key
```

## License

MIT
