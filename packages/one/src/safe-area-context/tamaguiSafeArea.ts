import type { EdgeInsets, Metrics, Rect } from './SafeArea-types'

// web: tamagui resolves `safe` to css env(safe-area-inset-*), so there is
// nothing to feed.
export function feedTamaguiSafeArea(
  _metrics: Metrics | null,
  _hooks: { useSafeAreaInsets: () => EdgeInsets; useSafeAreaFrame: () => Rect }
): void {}
