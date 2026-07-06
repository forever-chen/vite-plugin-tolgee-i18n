<!--
  I18nInspector — 可视化翻译编辑器组件

  功能:
  1. 在页面右下角显示触发按钮，点击进入编辑模式
  2. 编辑模式下，按住 Alt 并 hover 页面元素，可看到对应的 i18n key 和中英文翻译
  3. 点击元素弹出编辑弹窗，修改后直接推送到 Tolgee 并热更新 i18n 消息

  工作原理:
  - 进入编辑模式时，通过 patchT() 在每条翻译文本末尾注入不可见的零宽字符编码
  - 编码使用 ZERO(U+200B) 和 ONE(U+200C) 表示二进制，标记开始/结束用不同零宽字符对
  - hover 元素时通过 decodeKey() 解码出原始 i18n key
  - 退出编辑模式时通过 unpatchT() 移除所有注入的标记

  样式:
  - 完全自包含 (inline style + scoped CSS)，不依赖 UnoCSS / Element Plus
  - 所有样式可通过 InspectorStyleOptions 配置覆盖
-->
<script setup lang="ts">
import { ref, inject, watch, onMounted, onUnmounted, computed } from 'vue';
import type { I18n, Composer } from 'vue-i18n';
import type { InspectorStyleOptions, InspectorTheme, InspectorLocale } from '../types';
import { verifyStoredKey, verifyKey, getStoredKey } from './auth';

type LocaleLoader = (lang: string) => Promise<Record<string, any>>;

interface TranslationEntry {
    key: string;
    zhCN: string;
    en: string;
}

// 零宽字符编码标记 — 用于在翻译文本中隐藏 i18n key 信息
const MARKER_START = '\u200D\u2060'; // 编码起始标记
const MARKER_END = '\u2060\u200D'; // 编码结束标记
const ZERO = '\u200B'; // 二进制 0
const ONE = '\u200C'; // 二进制 1

const DISMISS_KEY = 'tolgee-i18n-dismissed';

// 通过 provide/inject 获取宿主传入的配置
const i18n = inject<I18n>('__tolgee_i18n_inspector_instance__')!;
const styleOptions = inject<InspectorStyleOptions>('__tolgee_i18n_inspector_style__', {});
const apiConfig = inject<{ apiUrl: string; apiKey: string }>('__tolgee_i18n_inspector_api__')!;
const localeLoader = inject<LocaleLoader | null>('__tolgee_i18n_inspector_locale_loader__', null);
const theme = inject<InspectorTheme>('__tolgee_i18n_inspector_theme__', 'dark');
const uiLocale = inject<InspectorLocale>('__tolgee_i18n_inspector_ui_locale__', 'zh-CN');

const global = i18n.global as unknown as Composer;

// ===== 主题色值映射 =====
const colors = computed(() => {
    if (theme === 'light') {
        return {
            barBg: '#ffffff',
            barText: '#1f2937',
            barHint: '#6b7280',
            tooltipBg: '#ffffff',
            tooltipText: '#1f2937',
            tooltipKey: '#2563eb',
            tooltipLabel: '#6b7280',
            tooltipSubText: '#374151',
            tooltipAction: '#2563eb',
            tooltipArrow: '#ffffff',
            dialogBg: '#ffffff',
            dialogTitle: '#1f2937',
            dialogLabel: '#374151',
            dialogKeyBg: '#eff6ff',
            dialogKeyText: '#2563eb',
            overlayBg: 'rgba(0, 0, 0, 0.3)',
            inputBorder: '#d1d5db',
            inputBg: '#ffffff',
            inputText: '#1f2937',
            btnBg: '#f3f4f6',
            btnText: '#374151',
            btnBorder: '#d1d5db',
            authHint: '#6b7280',
            errorText: '#ef4444',
            barShadow: '0 -2px 12px rgba(0,0,0,0.08)',
            tooltipShadow: '0 4px 16px rgba(0,0,0,0.12)',
            dialogShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
        };
    }
    return {
        barBg: '#1f2937',
        barText: '#ffffff',
        barHint: '#9ca3af',
        tooltipBg: '#1f2937',
        tooltipText: '#ffffff',
        tooltipKey: '#93c5fd',
        tooltipLabel: '#9ca3af',
        tooltipSubText: '#d1d5db',
        tooltipAction: '#60a5fa',
        tooltipArrow: '#1f2937',
        dialogBg: '#1f2937',
        dialogTitle: '#f9fafb',
        dialogLabel: '#d1d5db',
        dialogKeyBg: '#1e3a5f',
        dialogKeyText: '#93c5fd',
        overlayBg: 'rgba(0, 0, 0, 0.5)',
        inputBorder: '#4b5563',
        inputBg: '#111827',
        inputText: '#f9fafb',
        btnBg: '#374151',
        btnText: '#e5e7eb',
        btnBorder: '#4b5563',
        authHint: '#9ca3af',
        errorText: '#f87171',
        barShadow: '0 4px 12px rgba(0,0,0,0.15)',
        tooltipShadow: '0 4px 16px rgba(0,0,0,0.3)',
        dialogShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    };
});

// ===== 界面文案映射 =====
const t = computed(() => {
    if (uiLocale === 'en') {
        return {
            triggerLabel: 'i18n',
            authTitle: 'Editor Authentication',
            authHint: 'Please enter the Tolgee Api key to enable translation editing',
            authPlaceholder: 'Enter the Tolgee Api key',
            authError: 'Invalid key, please try again',
            cancel: 'Cancel',
            verify: 'Verify',
            editModeTitle: 'Translation Edit Mode',
            editModeHint: 'Hold Alt + hover to inspect, click to edit',
            exit: 'Exit',
            tooltipLabelZh: 'ZH',
            tooltipLabelEn: 'EN',
            tooltipClickEdit: 'Click to edit',
            editDialogTitle: 'Edit Translation',
            labelZhCN: 'Chinese (CN)',
            labelEn: 'English (EN)',
            save: 'Save',
            saving: 'Saving...',
            saveFailed: 'Save failed: ',
            saveFailedNetwork: 'Please check network connection',
        };
    }
    return {
        triggerLabel: '文',
        authTitle: '文案编辑验证',
        authHint: '请输入Tolgee API KEY以启用文案编辑功能',
        authPlaceholder: '请输入Tolgee API KEY',
        authError: 'API KEY错误，请重试',
        cancel: '取消',
        verify: '验证',
        editModeTitle: '文案编辑模式',
        editModeHint: '按住 Alt 移动鼠标查看 key，点击编辑',
        exit: '退出',
        tooltipLabelZh: '中文',
        tooltipLabelEn: 'EN',
        tooltipClickEdit: '点击编辑',
        editDialogTitle: '编辑文案',
        labelZhCN: '中文 (CN)',
        labelEn: 'English (EN)',
        save: '保存',
        saving: '保存中...',
        saveFailed: '保存失败: ',
        saveFailedNetwork: '请检查网络连接',
    };
});

const zIndex = computed(() => styleOptions.zIndex || 99999);

const dismissed = ref(!!localStorage.getItem(DISMISS_KEY));
const authenticated = ref(verifyStoredKey());
const verifying = ref(false);
const showAuthDialog = ref(false);
const authInput = ref('');
const authError = ref('');
const editMode = ref(false);
const altHeld = ref(false);
const saving = ref(false);

const entries = ref<TranslationEntry[]>([]);
const tip = ref<{ key: string; zhCN: string; en: string; x: number; y: number; el: HTMLElement; below: boolean } | null>(null);
const editing = ref<{ key: string; zhCN: string; en: string } | null>(null);

// ===== 样式计算 (合并默认值与用户配置) =====

const triggerStyle = computed(() => {
    const s = styleOptions.trigger || {};
    return {
        bottom: s.bottom || '32px',
        right: s.right || '32px',
        left: s.left || undefined,
        top: s.top || undefined,
        width: s.size || '48px',
        height: s.size || '48px',
        background: s.background || 'linear-gradient(135deg, #409eff, #337ecc)',
        color: s.text || '#fff',
        zIndex: zIndex.value,
    };
});

const tooltipStyle = computed(() => {
    const tt = styleOptions.tooltip || {};
    return {
        background: tt.background || colors.value.tooltipBg,
        color: tt.textColor || colors.value.tooltipText,
        maxWidth: tt.maxWidth || '360px',
        borderRadius: tt.borderRadius || '8px',
        padding: tt.padding || '12px 16px',
        boxShadow: colors.value.tooltipShadow,
    };
});

const dialogStyle = computed(() => {
    const d = styleOptions.dialog || {};
    return {
        width: d.width || '500px',
        padding: d.padding || '32px',
        borderRadius: d.borderRadius || '8px',
    };
});

const barStyle = computed(() => {
    const b = styleOptions.bar || {};
    return {
        background: b.background || colors.value.barBg,
        color: b.textColor || colors.value.barText,
        padding: b.padding || '12px 20px',
        borderRadius: b.borderRadius || '8px',
        boxShadow: colors.value.barShadow,
    };
});

// ===== 零宽字符编解码 =====

/** 将 i18n key 编码为不可见的零宽字符串，附加到翻译文本末尾 */
function encodeKey(key: string): string {
    const binary = Array.from(key)
        .map(ch => ch.charCodeAt(0).toString(2).padStart(8, '0'))
        .join('');
    return MARKER_START + binary.replace(/0/g, ZERO).replace(/1/g, ONE) + MARKER_END;
}

/** 从 DOM 元素文本中解码出 i18n key */
function decodeKey(text: string): string | null {
    const start = text.lastIndexOf(MARKER_START);
    if (start === -1) return null;
    const end = text.indexOf(MARKER_END, start + MARKER_START.length);
    if (end === -1) return null;
    const encoded = text.slice(start + MARKER_START.length, end);
    if (!encoded) return null;
    if (!isValidEncoded(encoded)) return null;
    const binary = encoded.replace(new RegExp(ZERO, 'g'), '0').replace(new RegExp(ONE, 'g'), '1');
    if (binary.length % 8 !== 0) return null;
    let result = '';
    for (let i = 0; i < binary.length; i += 8) {
        result += String.fromCharCode(parseInt(binary.slice(i, i + 8), 2));
    }
    return result;
}

function isValidEncoded(str: string): boolean {
    for (const ch of str) {
        if (ch !== ZERO && ch !== ONE) return false;
    }
    return str.length > 0;
}

// ===== i18n 消息注入/清除 =====

/** 进入编辑模式: 为所有翻译文本注入零宽编码标记 */
function patchT() {
    const zhMessages = global.getLocaleMessage('zh-CN');
    const enMessages = global.getLocaleMessage('en');
    if (zhMessages && Object.keys(zhMessages).length) {
        global.setLocaleMessage('zh-CN', injectKeysToMessages(removeKeysFromMessages(zhMessages)));
    }
    if (enMessages && Object.keys(enMessages).length) {
        global.setLocaleMessage('en', injectKeysToMessages(removeKeysFromMessages(enMessages)));
    }
}

/** 退出编辑模式: 移除所有零宽编码标记，恢复原文 */
function unpatchT() {
    const zhMessages = global.getLocaleMessage('zh-CN');
    const enMessages = global.getLocaleMessage('en');
    if (zhMessages && Object.keys(zhMessages).length) {
        global.setLocaleMessage('zh-CN', removeKeysFromMessages(zhMessages));
    }
    if (enMessages && Object.keys(enMessages).length) {
        global.setLocaleMessage('en', removeKeysFromMessages(enMessages));
    }
}

function injectKeysToMessages(obj: Record<string, any>, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'string') {
            result[key] = obj[key] + encodeKey(fullKey);
        } else if (obj[key] && typeof obj[key] === 'object') {
            result[key] = injectKeysToMessages(obj[key], fullKey);
        } else {
            result[key] = obj[key];
        }
    }
    return result;
}

function removeKeysFromMessages(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
            const idx = obj[key].indexOf(MARKER_START);
            result[key] = idx === -1 ? obj[key] : obj[key].slice(0, idx);
        } else if (obj[key] && typeof obj[key] === 'object') {
            result[key] = removeKeysFromMessages(obj[key]);
        } else {
            result[key] = obj[key];
        }
    }
    return result;
}

// ===== 工具函数 =====

/** 将嵌套消息对象扁平化为 dot-notation key-value */
function flatten(obj: Record<string, any>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'string') result[fullKey] = obj[key];
        else if (obj[key] && typeof obj[key] === 'object') Object.assign(result, flatten(obj[key], fullKey));
    }
    return result;
}

/** 从 entries 数组重建嵌套消息对象 */
function rebuildMessages(entriesToUse: TranslationEntry[]): { zhCN: Record<string, any>; en: Record<string, any> } {
    const zhCN: Record<string, any> = {};
    const en: Record<string, any> = {};
    for (const e of entriesToUse) {
        const parts = e.key.split('.');
        let curZh = zhCN;
        let curEn = en;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curZh[parts[i]]) curZh[parts[i]] = {};
            if (!curEn[parts[i]]) curEn[parts[i]] = {};
            curZh = curZh[parts[i]];
            curEn = curEn[parts[i]];
        }
        curZh[parts[parts.length - 1]] = e.zhCN;
        curEn[parts[parts.length - 1]] = e.en;
    }
    return { zhCN, en };
}

// ===== Tolgee API 交互 =====

/** 将修改后的翻译推送到 Tolgee 服务端 */
async function pushToTolgee(key: string, zhCN: string, en: string) {
    const storedKey = getStoredKey();
    const res = await fetch(`${apiConfig.apiUrl}/v2/projects/translations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': storedKey,
        },
        body: JSON.stringify({
            key,
            translations: { zh: zhCN, en },
        }),
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Tolgee API error: ${res.status} ${errText}`);
    }
}

watch(global.locale, () => {
    if (editMode.value) {
        patchT();
    }
});

onMounted(async () => {
    try {
        // 确保两种语言的消息都已加载 (项目按需加载，初始可能只有当前语言)
        let zhMessages = global.getLocaleMessage('zh-CN');
        let enMessages = global.getLocaleMessage('en');

        if ((!zhMessages || !Object.keys(zhMessages).length) && localeLoader) {
            try {
                zhMessages = await localeLoader('zh-CN');
                global.setLocaleMessage('zh-CN', zhMessages);
            } catch {}
        }
        if ((!enMessages || !Object.keys(enMessages).length) && localeLoader) {
            try {
                enMessages = await localeLoader('en');
                global.setLocaleMessage('en', enMessages);
            } catch {}
        }

        let flatZh: Record<string, string> = {};
        let flatEn: Record<string, string> = {};

        if (zhMessages && Object.keys(zhMessages).length) {
            flatZh = flatten(zhMessages as Record<string, any>);
        }
        if (enMessages && Object.keys(enMessages).length) {
            flatEn = flatten(enMessages as Record<string, any>);
        }

        const allKeys = new Set([...Object.keys(flatZh), ...Object.keys(flatEn)]);
        entries.value = Array.from(allKeys).map(key => ({
            key,
            zhCN: flatZh[key] || '',
            en: flatEn[key] || '',
        }));
    } catch (e) {
        console.error('[I18nInspector] Failed to load locales:', e);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onDocClick, true);
});

onUnmounted(() => {
    unpatchT();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('click', onDocClick, true);
});

function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Alt' && editMode.value) {
        altHeld.value = true;
    }
    if (e.key === 'Escape') {
        if (editing.value) {
            cancelEdit();
        } else if (editMode.value) {
            exitEditMode();
        } else if (showAuthDialog.value) {
            showAuthDialog.value = false;
        }
    }
}

function onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Alt') {
        altHeld.value = false;
        tip.value = null;
    }
}

function toggleEditMode() {
    if (!authenticated.value) {
        showAuthDialog.value = true;
        return;
    }
    if (editMode.value) {
        exitEditMode();
    } else {
        editMode.value = true;
        patchT();
    }
}

function exitEditMode() {
    editMode.value = false;
    altHeld.value = false;
    tip.value = null;
    unpatchT();
}

function dismissInspector() {
    dismissed.value = true;
    localStorage.setItem(DISMISS_KEY, '1');
}

async function handleAuth() {
    verifying.value = true;
    authError.value = '';
    try {
        const valid = await verifyKey(apiConfig.apiUrl, authInput.value);
        if (valid) {
            authenticated.value = true;
            showAuthDialog.value = false;
            authInput.value = '';
            editMode.value = true;
            patchT();
        } else {
            authError.value = t.value.authError;
        }
    } catch {
        authError.value = t.value.authError;
    } finally {
        verifying.value = false;
    }
}

function onMouseMove(e: MouseEvent) {
    if (!editMode.value || !altHeld.value) {
        if (tip.value) tip.value = null;
        return;
    }

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!el || el.closest('#tolgee-i18n-inspector-container') || el.closest('.tolgee-inspector-overlay')) {
        if (tip.value) tip.value = null;
        return;
    }

    if (tip.value && tip.value.el === el) return;

    const foundKey = findKeyInElement(el);
    if (!foundKey) {
        tip.value = null;
        return;
    }

    const entry = entries.value.find(ee => ee.key === foundKey);
    if (!entry) {
        tip.value = null;
        return;
    }

    const rect = el.getBoundingClientRect();
    const showBelow = rect.top < 120;
    tip.value = {
        key: foundKey,
        zhCN: entry.zhCN,
        en: entry.en,
        x: rect.left + rect.width / 2,
        y: showBelow ? rect.bottom : rect.top,
        el,
        below: showBelow,
    };
}

function findKeyInElement(el: HTMLElement): string | null {
    if (el.children.length === 0) {
        const text = el.textContent || '';
        return decodeKey(text);
    }
    for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            const key = decodeKey(text);
            if (key) return key;
        }
    }
    const text = el.textContent || '';
    return decodeKey(text);
}

function onDocClick(e: MouseEvent) {
    if (!editMode.value || !altHeld.value || !tip.value) return;
    if ((e.target as HTMLElement)?.closest('#tolgee-i18n-inspector-container')) return;

    e.preventDefault();
    e.stopPropagation();

    editing.value = { key: tip.value.key, zhCN: tip.value.zhCN, en: tip.value.en };
    tip.value = null;
}

async function confirmEdit() {
    if (!editing.value) return;
    saving.value = true;
    try {
        await pushToTolgee(editing.value.key, editing.value.zhCN, editing.value.en);

        const entry = entries.value.find(e => e.key === editing.value!.key);
        if (entry) {
            entry.zhCN = editing.value.zhCN;
            entry.en = editing.value.en;

            const messages = rebuildMessages(entries.value);
            global.setLocaleMessage('zh-CN', messages.zhCN);
            global.setLocaleMessage('en', messages.en);
            patchT();
        }
        editing.value = null;
    } catch (err: any) {
        console.error('[I18nInspector] Save failed:', err);
        alert(`${t.value.saveFailed}${err.message || t.value.saveFailedNetwork}`);
    } finally {
        saving.value = false;
    }
}

function cancelEdit() {
    editing.value = null;
}
</script>

<template>
    <div>
        <Teleport to="body">
            <div
                v-show="!editMode && !dismissed"
                class="tolgee-trigger-wrapper"
                :style="{ zIndex: zIndex, bottom: styleOptions.trigger?.bottom || '32px', right: styleOptions.trigger?.right || '32px' }"
            >
                <button class="tolgee-trigger-btn" :style="triggerStyle" @click="toggleEditMode">
                    {{ styleOptions.trigger?.label || t.triggerLabel }}
                </button>
                <button class="tolgee-trigger-close" @click="dismissInspector" :style="{ color: styleOptions.trigger?.text || '#fff' }">✕</button>
            </div>
        </Teleport>

        <Teleport to="body">
            <div v-if="showAuthDialog" class="tolgee-inspector-overlay" :style="{ zIndex, background: colors.overlayBg }">
                <div
                    class="tolgee-dialog"
                    :style="{
                        width: '400px',
                        padding: '32px',
                        borderRadius: dialogStyle.borderRadius,
                        background: colors.dialogBg,
                        boxShadow: colors.dialogShadow,
                    }"
                >
                    <div :style="{ fontSize: '18px', fontWeight: '600', color: colors.dialogTitle, marginBottom: '8px' }">
                        {{ t.authTitle }}
                    </div>
                    <div :style="{ fontSize: '14px', color: colors.authHint, marginBottom: '24px' }">{{ t.authHint }}</div>
                    <input
                        v-model="authInput"
                        type="password"
                        :placeholder="t.authPlaceholder"
                        class="tolgee-input"
                        :style="{ borderColor: colors.inputBorder, background: colors.inputBg, color: colors.inputText }"
                        @keyup.enter="handleAuth"
                    />
                    <div v-if="authError" :style="{ fontSize: '12px', color: colors.errorText, marginTop: '8px' }">{{ authError }}</div>
                    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px">
                        <button
                            class="tolgee-btn"
                            :style="{ background: colors.btnBg, color: colors.btnText, borderColor: colors.btnBorder }"
                            @click="showAuthDialog = false"
                        >
                            {{ t.cancel }}
                        </button>
                        <button class="tolgee-btn tolgee-btn-primary" :disabled="verifying" @click="handleAuth">
                            {{ verifying ? '验证中...' : t.verify }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <Teleport to="body">
            <div v-if="editMode" class="tolgee-bar" :style="barStyle">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex-shrink: 0" />
                <span style="font-size: 14px">{{ t.editModeTitle }}</span>
                <span :style="{ fontSize: '12px', color: colors.barHint, marginLeft: '8px' }">
                    {{ t.editModeHint }}
                </span>
                <button class="tolgee-btn-exit" @click="exitEditMode">{{ t.exit }}</button>
            </div>
        </Teleport>

        <Teleport to="body">
            <div
                v-if="tip"
                class="tolgee-tooltip"
                :style="{
                    ...tooltipStyle,
                    left: tip.x + 'px',
                    top: tip.below ? tip.y + 8 + 'px' : tip.y - 8 + 'px',
                    transform: tip.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                    zIndex,
                }"
            >
                <div v-if="tip.below" class="tolgee-tooltip-arrow tolgee-tooltip-arrow--top" :style="{ borderBottomColor: colors.tooltipArrow }" />
                <div :style="{ fontSize: '12px', color: colors.tooltipKey, fontFamily: 'monospace', marginBottom: '8px', wordBreak: 'break-all' }">
                    {{ tip.key }}
                </div>
                <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px">
                    <span :style="{ fontSize: '12px', color: colors.tooltipLabel, flexShrink: '0', width: '30px' }">{{ t.tooltipLabelZh }}</span>
                    <span style="font-size: 13px; word-break: break-all">{{ tip.zhCN }}</span>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px">
                    <span :style="{ fontSize: '12px', color: colors.tooltipLabel, flexShrink: '0', width: '30px' }">{{ t.tooltipLabelEn }}</span>
                    <span :style="{ fontSize: '13px', color: colors.tooltipSubText, wordBreak: 'break-all' }">{{ tip.en }}</span>
                </div>
                <div :style="{ fontSize: '11px', color: colors.tooltipAction }">{{ t.tooltipClickEdit }}</div>
                <div v-if="!tip.below" class="tolgee-tooltip-arrow" :style="{ borderTopColor: colors.tooltipArrow }" />
            </div>
        </Teleport>

        <Teleport to="body">
            <div v-if="editing" class="tolgee-inspector-overlay" :style="{ zIndex, background: colors.overlayBg }" @click.self="cancelEdit">
                <div class="tolgee-dialog" :style="{ ...dialogStyle, background: colors.dialogBg, boxShadow: colors.dialogShadow }">
                    <div :style="{ fontSize: '16px', fontWeight: '600', color: colors.dialogTitle, marginBottom: '16px' }">
                        {{ t.editDialogTitle }}
                    </div>
                    <div
                        :style="{
                            fontSize: '12px',
                            color: colors.dialogKeyText,
                            fontFamily: 'monospace',
                            marginBottom: '24px',
                            wordBreak: 'break-all',
                            background: colors.dialogKeyBg,
                            borderRadius: '4px',
                            padding: '8px 12px',
                        }"
                    >
                        {{ editing.key }}
                    </div>

                    <div style="margin-bottom: 20px">
                        <div :style="{ fontSize: '14px', color: colors.dialogLabel, marginBottom: '8px', fontWeight: '500' }">
                            {{ t.labelZhCN }}
                        </div>
                        <textarea
                            v-model="editing.zhCN"
                            class="tolgee-textarea"
                            :style="{ borderColor: colors.inputBorder, background: colors.inputBg, color: colors.inputText }"
                            rows="3"
                        />
                    </div>
                    <div style="margin-bottom: 24px">
                        <div :style="{ fontSize: '14px', color: colors.dialogLabel, marginBottom: '8px', fontWeight: '500' }">
                            {{ t.labelEn }}
                        </div>
                        <textarea
                            v-model="editing.en"
                            class="tolgee-textarea"
                            :style="{ borderColor: colors.inputBorder, background: colors.inputBg, color: colors.inputText }"
                            rows="3"
                        />
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 12px">
                        <button
                            class="tolgee-btn"
                            :style="{ background: colors.btnBg, color: colors.btnText, borderColor: colors.btnBorder }"
                            :disabled="saving"
                            @click="cancelEdit"
                        >
                            {{ t.cancel }}
                        </button>
                        <button class="tolgee-btn tolgee-btn-primary" :disabled="saving" @click="confirmEdit">
                            {{ saving ? t.saving : t.save }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.tolgee-trigger-wrapper {
    position: fixed;
    z-index: 99999;
}

.tolgee-trigger-wrapper:hover .tolgee-trigger-close {
    opacity: 1;
    transform: scale(1);
}

.tolgee-trigger-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    font-size: 20px;
    border: none;
    transition: transform 0.2s;
}

.tolgee-trigger-btn:hover {
    transform: scale(1.1);
}

.tolgee-trigger-close {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.2s;
    color: #fff;
}

.tolgee-trigger-close:hover {
    background: rgba(0, 0, 0, 0.8);
}

.tolgee-inspector-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tolgee-dialog {
    border-radius: 8px;
}

.tolgee-bar {
    position: fixed;
    bottom: 20px;
    left: 50%;
    z-index: 10000000;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
}

.tolgee-bar kbd {
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 11px;
}

.tolgee-tooltip {
    position: fixed;
    pointer-events: none;
}

.tolgee-tooltip-arrow {
    width: 0;
    height: 0;
    margin: 0 auto;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid currentColor;
}

.tolgee-tooltip-arrow--top {
    width: 0;
    height: 0;
    margin: 0 auto 8px;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid currentColor;
}

.tolgee-input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
}

.tolgee-input:focus {
    border-color: #409eff;
}

.tolgee-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    resize: vertical;
    font-family: inherit;
    transition: border-color 0.2s;
}

.tolgee-textarea:focus {
    border-color: #409eff;
}

.tolgee-btn {
    padding: 8px 20px;
    border-radius: 6px;
    border: 1px solid;
    font-size: 14px;
    cursor: pointer;
    transition:
        background 0.2s,
        opacity 0.2s;
}

.tolgee-btn:hover {
    opacity: 0.85;
}

.tolgee-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.tolgee-btn-primary {
    background: #409eff;
    color: #fff;
    border-color: #409eff;
}

.tolgee-btn-primary:hover {
    background: #337ecc;
}

.tolgee-btn-exit {
    margin-left: 16px;
    padding: 4px 12px;
    border-radius: 4px;
    background: #ef4444;
    color: #fff;
    font-size: 12px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
}

.tolgee-btn-exit:hover {
    background: #dc2626;
}
</style>
