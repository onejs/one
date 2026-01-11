/**
 * Native no-op for useScrollGroup.
 * Scroll position groups are a web-only feature.
 */
export function useScrollGroup(_groupPath?: string) {
  // No-op on native - scroll position is handled differently
}
