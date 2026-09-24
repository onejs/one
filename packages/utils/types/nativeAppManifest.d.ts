export interface NativeAppManifest {
  name: string
  displayName?: string
  scheme?: string | string[]
  version?: string
  icon?: {
    source: string
    backgroundColor: string
  }
  splash?: {
    source: string
    backgroundColor: string
    width?: number
  }
  imagePicker?: {
    camera?: string
  }
  notifications?: {
    push?: boolean
  }
  ios?: {
    bundleId: string
    buildNumber?: string
    tablet?: boolean
    deploymentTarget?: string
    screensGamma?: boolean
    useFrameworks?: 'static' | 'dynamic'
    ccache?: boolean
    usesNonExemptEncryption?: boolean
    fileSharing?: boolean
    widgets?: {
      appGroup: string
      kind: string
      displayName: string
      description: string
      pushNotifications?: boolean
      jsx?: {
        id: string
        displayName: string
        description: string
      }
    }
  }
  android?: {
    applicationId: string
    versionCode?: number
    minSdk?: number
    adaptiveIcon?: {
      foreground?: string
      background?: string
    }
    googleMapsApiKey?: string
  }
}
export declare function validateNativeApp(
  manifest: NativeAppManifest,
  platform?: 'ios' | 'android' | string
): NativeAppManifest
//# sourceMappingURL=nativeAppManifest.d.ts.map
