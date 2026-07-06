# vite-plugin-tolgee-i18n

**[中文](./README.zh.md)** | **[English](./README.md)**

[![npm version](https://img.shields.io/npm/v/vite-plugin-tolgee-i18n)](https://www.npmjs.com/package/vite-plugin-tolgee-i18n)
[![Vue](https://img.shields.io/badge/Vue-3.3+-4fc08d)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-4+-646cff)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-repo-181717?logo=github)](https://github.com/forever-chen/vite-plugin-tolgee-i18n)

> 一体化的 Vue 3 + Tolgee 国际化解决方案，团队协作翻译零冲突。

> ⚠️ **Vue 3 Only** — 本插件当前仅支持 Vue 3（依赖 `vue >=3.3` 和 `vue-i18n >=9`）。React 和 Vue 2 支持已在计划中。

## 为什么不直接用官方 Tolgee？

Tolgee 官方提供浏览器扩展 + SDK 集成，但在实际项目中有明显的局限性：

|                  | 官方 Tolgee                                                       | vite-plugin-tolgee-i18n                           |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| **安装配置**     | 每个团队成员必须安装 Chrome 扩展                                  | 无需安装扩展，开箱即用                            |
| **API 入侵**     | 必须将 vue-i18n 替换为 `@tolgee/vue`，所有 `$t()` 改为 `<T>` 组件 | 保持原生 `vue-i18n`，`$t()` 用法不变，零 API 变更 |
| **代码改造成本** | 需要重构整个 i18n 层，用 Tolgee Provider 包裹应用                 | 注册一个 Vite 插件 + main.ts 加一行代码           |
| **生产环境影响** | Tolgee SDK 会打包到生产包中，增加体积                             | Inspector 仅在 DEV 模式加载，生产零影响           |
| **团队协作门槛** | 每人需配置扩展 + API Key                                          | 项目配好，新成员只需 `pnpm dev`                   |
| **迁移成本**     | 需要逐页替换 i18n 实现，改造成本极高                              | 5 分钟配置，已有翻译代码无需任何改动              |

### 核心理念：近零入侵

本插件的设计目标是 **不修改你已有的任何 i18n 代码**：

- ✅ 继续使用原生 `vue-i18n` API（`$t()`、`useI18n()`、`<i18n-t>` 等）
- ✅ 翻译文件（`zh-CN.ts`、`en.ts`）保持不变，无需更改格式
- ✅ 路由、组件、Store 中的 i18n 逻辑完全不变
- ✅ 生产构建不包含任何额外依赖
- ✅ 移除插件对项目零影响，100% 可逆

仅有的改动是两个初始化点：

```ts
// vite.config.ts — 添加一个插件
tolgeePlugin({ apiUrl, apiKey, locales, syncToCache: true });

// main.ts — DEV 模式下启用 Inspector（可选）
if (import.meta.env.DEV) {
    setupI18nInspector(app, i18n, { apiUrl, apiKey });
}
```

## 解决了什么问题？

在多人的前端项目中，i18n 翻译管理存在这些痛点：

### 传统 i18n 工作流的问题

| 痛点               | 表现                                                 | 影响                              |
| ------------------ | ---------------------------------------------------- | --------------------------------- |
| **翻译文件冲突**   | 多人同时编辑 `zh-CN.ts` / `en.ts`，频繁 Git 合并冲突 | 解决冲突浪费时间，翻译易丢失      |
| **开发-翻译脱节**  | 开发先完成代码再找翻译，翻译完再手动回填代码         | 流程长，翻译易遗漏或过期          |
| **无法所见即所得** | 翻译需手动改文件、保存、等 HMR                       | 效率低，尤其不适合非开发者        |
| **难以定位 key**   | 看到页面文案不知道对应的 i18n key，需要全局搜索      | 浪费时间，大项目中 key 越多越痛苦 |
| **平台割裂**       | Tolgee/Crowdin 翻译完成后需手动导出、替换文件        | 同步延迟，本地与平台不一致        |

### 本插件的解决方案

| 方案               | 实现方式                                                       |
| ------------------ | -------------------------------------------------------------- |
| **零冲突协作**     | 远程翻译写入 `.cache/`（gitignored），源文件不动，运行时合并   |
| **所见即所得编辑** | Alt+点击页面文案 → 直接编辑 → 即时推送 Tolgee，全程不离浏览器  |
| **一键定位 key**   | Alt+悬停任一文案，立即看到 i18n key 和所有语言的翻译           |
| **实时同步**       | 构建/启动时自动拉取 Tolgee 最新翻译，无需手动导入/导出         |
| **零入侵集成**     | 保持原生 vue-i18n，无 API 变更，无翻译文件格式变化，移除零影响 |

### 适用场景

- 3 人以上团队协作的国际化项目
- 使用 Tolgee 作为翻译管理平台
- 已有 vue-i18n 项目，希望接入 Tolgee 但不想重构 i18n 层
- 产品/运营人员需要直接编辑翻译文案
- 快速迭代项目，翻译需要跟上开发节奏

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
   ![点击按钮](https://raw.githubusercontent.com/forever-chen/vite-plugin-tolgee-i18n/main/assets/button.png)
   ![输入toggle secret](https://raw.githubusercontent.com/forever-chen/vite-plugin-tolgee-i18n/main/assets/toggleKey.png)
2. 按住 **Alt** 悬停文案 → 查看 i18n key 和中英文翻译
   ![修改文案](https://raw.githubusercontent.com/forever-chen/vite-plugin-tolgee-i18n/main/assets/changeWords.png)
3. 按住 **Alt** 点击文案 → 弹出编辑框，修改后保存 → 即时推送到 Tolgee
4. 刷新页面，Tolgee 新翻译自动生效

## 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                      开发者浏览器                             │
│                                                             │
│  ┌─────────────┐    Alt+Hover     ┌──────────────────────┐  │
│  │  页面文案     │ ───────────────→ │  Inspector 浮层       │  │
│  │  $t('key')  │                  │  显示 key + 语言翻译   │  │
│  └─────────────┘    Alt+Click     └──────────────────────┘  │
│         │          ─────────────→  ┌──────────────────────┐  │
│         │                          │  编辑对话框            │  │
│         │                          │  修改 → 保存          │  │
│         │                          └──────────┬───────────┘  │
│         │                                     │              │
│         │                                     │ Push API     │
│         │ vue-i18n                            ▼              │
│         │                          ┌──────────────────────┐  │
│         │                          │   Tolgee 服务端       │  │
│         │                          │   (翻译管理平台)       │  │
│         │                          └──────────┬───────────┘  │
│         │                                     │              │
│         ▼                                     │ Pull (启动时) │
│ ┌─────────────────────────────────────────────────────────────┐
│ │                     Vite Dev Server                         │
│ │                                                             │
│ │  tolgeePlugin:                                              │
│ │  1. 启动时拉取远程翻译                                       │
│ │  2. 写入 .cache/ (gitignored)                               │
│ │  3. 运行时深度合并本地翻译                                   │
│ │  4. HMR 热更新翻译                                          │
│ └─────────────────────────────────────────────────────────────┘
```

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

## 致谢

本插件基于 [Tolgee](https://tolgee.io) 构建，Tolgee 是一个开源翻译管理平台。感谢 Tolgee 团队提供优秀的翻译基础设施和开放 API，使社区能够构建更灵活的集成方案。

本插件并非 Tolgee 官方产品。它是一个面向 Vue 3 + vue-i18n 项目的轻量替代集成方案，旨在降低接入门槛、最小化代码入侵。如果你的项目可以接受完整 SDK 集成，建议使用 [官方 Tolgee Vue 集成](https://tolgee.io/integrations/vue)。

## License

MIT

---

**GitHub**: [github.com/forever-chen/vite-plugin-tolgee-i18n](https://github.com/forever-chen/vite-plugin-tolgee-i18n) — ⭐ Star & contribute welcome!

**Issues**: [github.com/forever-chen/vite-plugin-tolgee-i18n/issues](https://github.com/forever-chen/vite-plugin-tolgee-i18n/issues) — Bug reports & feature requests
