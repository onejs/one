// over-the-air update shapes. the manifest is the static json the server
// hosts at <url>/<platform>/<runtimeVersion>/manifest.json: one id and
// timestamp per publish, the hermes bundle plus every asset the bundle
// references, and publisher metadata. asset paths are relative to the
// update directory, exactly where React Native resolves them next to a
// bundle loaded from a file url.
export interface UpdateAsset {
  // sha256 of the bytes, base64url
  hash: string
  // where to download the bytes; may be relative to the manifest
  url: string
  // where the file lands in the update directory
  path: string
}

export type UpdateMetadataValue = string | number | boolean

export interface UpdateManifest {
  id: string
  // iso 8601; the ordering key. compare with new Date(createdAt).
  createdAt: string
  runtimeVersion: string
  launchAsset: UpdateAsset
  assets: UpdateAsset[]
  metadata: Record<string, UpdateMetadataValue>
}

export type UpdatesCheckResult =
  | { type: 'available'; manifest: UpdateManifest }
  | { type: 'none' }

export type UpdatesFetchResult =
  | { type: 'fetched'; manifest: UpdateManifest }
  | { type: 'none' }

export interface UpdatesStagedSubscription {
  remove(): void
}

// values fixed for the process, read once at import. updateId is the
// embedded id on an embedded launch; manifest is null there.
export interface UpdatesApi {
  readonly isEnabled: boolean
  readonly runtimeVersion: string | null
  readonly updateId: string | null
  readonly isEmbeddedLaunch: boolean
  readonly createdAt: Date | null
  readonly manifest: UpdateManifest | null
  check(): Promise<UpdatesCheckResult>
  fetch(): Promise<UpdatesFetchResult>
  getStaged(): UpdateManifest | null
  addStagedListener(
    listener: (staged: UpdateManifest | null) => void
  ): UpdatesStagedSubscription
  reload(): Promise<void>
}
