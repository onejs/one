import type { HybridObject } from 'react-native-nitro-modules'

// runtime font loading behind One.UI.Fonts, keyed by PostScript name. load
// makes the uri a local file and registers it for the process; isLoaded is
// sync because it asks the platform on every render.
export interface OneFonts extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  load(name: string, uri: string): Promise<void>
  isLoaded(name: string): boolean
}
