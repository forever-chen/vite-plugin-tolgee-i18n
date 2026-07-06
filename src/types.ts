/**
 * 插件配置类型定义
 *
 * 定义 Vite 插件选项、Inspector 选项、以及 Inspector 中各 UI 组件的样式配置。
 */

/** Inspector 主题 */
export type InspectorTheme = 'dark' | 'light';

/** Inspector 界面语言 */
export type InspectorLocale = 'zh-CN' | 'en';

/** Vite 插件主配置 */
export interface TolgeePluginOptions {
    /** Tolgee 服务端 API 地址 */
    apiUrl: string;
    /** Tolgee 项目 API Key */
    apiKey: string;
    /**
     * 本地 locale 文件路径映射
     * key: Tolgee 中的语言标识 (如 'zh', 'en')
     * value: 项目中 locale 文件的相对路径后缀 (如 'locales/zh-CN.ts')
     * @default { zh: 'locales/zh-CN.ts', en: 'locales/en.ts' }
     */
    locales?: Record<string, string>;
    /** Inspector 开发工具配置 (传 true 启用默认配置) */
    inspector?: InspectorOptions | boolean;
    /**
     * 是否将 Tolgee 翻译同步到本地 .cache 目录（不进 git）
     * 开启后每次页面刷新时 transform 会重新拉取最新 Tolgee 数据后 merge 再返回，
     * 并同步写入 src/locales/.cache/ 供本地查阅。
     * @default false
     */
    syncToCache?: boolean;
}

/** Inspector 开发工具选项 */
export interface InspectorOptions {
    /** 是否启用 Inspector */
    enabled?: boolean;
    /** Inspector UI 样式配置 */
    style?: InspectorStyleOptions;
}

/** Inspector UI 样式配置，所有属性均为可选，不传则使用默认值 */
export interface InspectorStyleOptions {
    /** 右下角悬浮触发按钮样式 */
    trigger?: {
        /** 距底部距离 @default '32px' */
        bottom?: string;
        /** 距右侧距离 @default '32px' */
        right?: string;
        /** 距左侧距离 (设置后 right 失效) */
        left?: string;
        /** 距顶部距离 (设置后 bottom 失效) */
        top?: string;
        /** 按钮尺寸 (宽高) @default '48px' */
        size?: string;
        /** 按钮背景 @default 'linear-gradient(135deg, #409eff, #337ecc)' */
        background?: string;
        /** 按钮文字颜色 @default '#fff' */
        text?: string;
        /** 按钮显示文字 @default '文' */
        label?: string;
    };
    /** 悬浮提示框 (Alt+hover 时显示) 样式 */
    tooltip?: {
        /** 背景色 @default '#1f2937' */
        background?: string;
        /** 文字颜色 @default '#fff' */
        textColor?: string;
        /** 最大宽度 @default '360px' */
        maxWidth?: string;
        /** 圆角 @default '8px' */
        borderRadius?: string;
        /** 内边距 @default '12px 16px' */
        padding?: string;
    };
    /** 编辑弹窗样式 */
    dialog?: {
        /** 弹窗宽度 @default '500px' */
        width?: string;
        /** 内边距 @default '32px' */
        padding?: string;
        /** 圆角 @default '8px' */
        borderRadius?: string;
    };
    /** 底部编辑模式状态条样式 */
    bar?: {
        /** 背景色 @default '#1f2937' */
        background?: string;
        /** 文字颜色 @default '#fff' */
        textColor?: string;
        /** 内边距 @default '12px 20px' */
        padding?: string;
        /** 圆角 @default '8px' */
        borderRadius?: string;
    };
    /** 所有浮层的 z-index @default 99999 */
    zIndex?: number;
}
