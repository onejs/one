// @ts-expect-error
export const isTauri = typeof window !== 'undefined' && window['__TAURI__'] !== undefined
