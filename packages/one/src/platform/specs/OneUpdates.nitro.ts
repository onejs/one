import type { HybridObject } from 'react-native-nitro-modules'

// over-the-air updates behind One.Updates: the native launcher selects the
// bundle before React Native starts, and this object exposes the running
// update plus check, fetch, and reload. manifests cross as json: native
// holds the parsed manifest for selection and download, js parses what it
// displays. staged is undefined when nothing newer than the running update
// is downloaded.
export type OneUpdatesCheckType = 'available' | 'none'

export type OneUpdatesFetchType = 'fetched' | 'none'

export interface OneUpdatesCheckResult {
  type: OneUpdatesCheckType
  manifestJson?: string
}

export interface OneUpdatesFetchResult {
  type: OneUpdatesFetchType
  manifestJson?: string
}

export interface OneUpdates extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly isEnabled: boolean
  readonly runtimeVersion: string | undefined
  readonly updateId: string | undefined
  readonly isEmbeddedLaunch: boolean
  readonly createdAt: string | undefined
  readonly manifestJson: string | undefined
  check(): Promise<OneUpdatesCheckResult>
  fetch(): Promise<OneUpdatesFetchResult>
  getStagedJson(): string | undefined
  addStagedListener(listener: (stagedJson: string | undefined) => void): () => void
  reload(): Promise<void>
}
