/**
 * Inspector 认证模块
 *
 * 使用 localStorage 存储认证状态，验证码即 Tolgee API Key。
 * 验证通过后将 key 持久化，后续刷新页面无需重复验证。
 */

const AUTH_KEY = 'tolgee-i18n-auth';

/**
 * 对 Tolgee API 发起一个轻量请求来验证 key 是否有效
 */
async function validateKeyWithTolgee(apiUrl: string, apiKey: string): Promise<boolean> {
    try {
        const params = new URLSearchParams({ size: '1' });
        const res = await fetch(`${apiUrl}/v2/projects/translations?${params}`, {
            headers: { 'X-API-Key': apiKey },
        });
        return res.ok;
    } catch {
        return false;
    }
}

/** 检查当前是否已认证（仅检查 localStorage，乐观） */
export function getAuthStatus(): boolean {
    return !!localStorage.getItem(AUTH_KEY);
}

/** 获取已存储的 API Key */
export function getStoredKey(): string {
    return localStorage.getItem(AUTH_KEY) || '';
}

/**
 * 通过 Tolgee API 验证用户输入的 key 是否有效
 * @param apiUrl Tolgee API 地址
 * @param apiKey 用户输入的 API Key
 * @returns 验证是否通过
 */
export async function verifyKey(apiUrl: string, apiKey: string): Promise<boolean> {
    if (!apiUrl || !apiKey) return false;
    const valid = await validateKeyWithTolgee(apiUrl, apiKey);
    if (valid) localStorage.setItem(AUTH_KEY, apiKey);
    return valid;
}

/**
 * 校验已存储的 key 是否仍然有效（乐观：有存储即认为有效）
 * 若 API 调用失败时再提示重新认证
 */
export function verifyStoredKey(): boolean {
    return !!localStorage.getItem(AUTH_KEY);
}

/** 清除认证状态 */
export function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
}
