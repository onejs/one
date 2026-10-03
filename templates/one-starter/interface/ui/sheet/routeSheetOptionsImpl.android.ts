import type { RouteSheetAndroidOptions, RouteSheetSettings } from './routeSheetContract'

export type {
  RouteSheetAndroidOptions,
  RouteSheetDetent,
  RouteSheetSettings,
} from './routeSheetContract'

// the android leg: react-native-screens' formSheet is an ios presentation, and
// on android it draws the system sheet instead of the product's own. the route
// presents over the presenting screen as a transparent modal with no system
// animation, and forms/FormSheetBodyImpl.android.tsx draws the Tamagui sheet in
// it: the same frame, overlay, and drag to dismiss the web route sheet uses.
//
// the settings are taken so a layout is identical on every platform. they shape
// the ios system sheet and the web route sheet; the android sheet is the
// Tamagui one with the same 50/92 detents, so there is no stack option here for
// them to reach.
export function formSheetOptions(
  _settings: RouteSheetSettings = {},
): RouteSheetAndroidOptions {
  return {
    presentation: 'transparentModal',
    contentStyle: { backgroundColor: 'transparent' },
    animation: 'none',
  }
}
