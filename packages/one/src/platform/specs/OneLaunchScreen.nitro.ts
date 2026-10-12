import type { HybridObject } from 'react-native-nitro-modules'

// the launch screen hold behind One.LaunchScreen. prebuild keeps the launch
// screen over the root until react native's first content; an app that
// reveals itself later stops that automatic release and hides it itself.
export interface OneLaunchScreen extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  preventAutoHide(): void
  hide(fade: boolean): void
}
