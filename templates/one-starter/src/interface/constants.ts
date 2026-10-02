const maxZIndex = Number.MAX_SAFE_INTEGER
export const Z_INDICES = {
  toast: maxZIndex,
  tooltip: maxZIndex - 1,
  hotmenu: 10_000,
  appview: 1_000_000,
}
