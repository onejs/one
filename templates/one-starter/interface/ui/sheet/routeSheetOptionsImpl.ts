import type { RouteSheetOptions, RouteSheetSettings } from './routeSheetContract'

export type {
  RouteSheetDetent,
  RouteSheetOptions,
  RouteSheetSettings,
} from './routeSheetContract'

// the ios and web leg. ios presents the system form sheet with the detents and
// the transparent content the frame's material sits over; web presents the same
// declaration through One's route-sheet presentation, which reads the radius
// and the undimmed detent. android resolves routeSheetOptionsImpl.android.ts
// instead.
export function formSheetOptions({
  initialDetent = 'half',
  undimmed = false,
}: RouteSheetSettings = {}): RouteSheetOptions {
  return {
    presentation: 'formSheet',
    sheetAllowedDetents: [0.5, 0.92],
    sheetCornerRadius: 28,
    sheetGrabberVisible: true,
    sheetInitialDetentIndex: initialDetent === 'half' ? 0 : 1,
    sheetLargestUndimmedDetentIndex: undimmed ? 0 : 'none',
    contentStyle: { backgroundColor: 'transparent' },
  }
}
