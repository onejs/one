import type { HybridObject } from 'react-native-nitro-modules'

// installed-binary identity behind One.AppInfo: sync readonly properties
// read from the running binary, undefined when the platform has no value.
export interface OneAppInfo extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly version: string | undefined
  readonly build: string | undefined
  readonly applicationId: string | undefined
}
