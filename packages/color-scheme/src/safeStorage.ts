// accessing localStorage can THROW, not just be undefined: Chrome with
// cookies/site-data blocked, sandboxed iframes, and some private-mode browsers
// make `window.localStorage` a getter that throws SecurityError. `typeof
// localStorage` evaluates that getter, so it throws too and is useless as a
// guard. on native it's simply not defined. wrap every access in try/catch so a
// blocked-storage user degrades gracefully instead of crashing hydration.

export function getStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function setStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {}
}
