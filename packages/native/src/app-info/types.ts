// installed-binary identity. version is the user-visible marketing version,
// build the binary build (stringified on both platforms so display and
// comparison code stays platform-blind), applicationId the install identity
// (bundle id on ios, application id on android). a snapshot read once and
// frozen; null means unknown, never guessed.
export interface AppInfo {
  /** user-visible version: CFBundleShortVersionString / versionName */
  readonly version: string | null
  /** binary build: CFBundleVersion / versionCode (stringified) */
  readonly build: string | null
  /** install identity: CFBundleIdentifier / applicationId */
  readonly applicationId: string | null
}
