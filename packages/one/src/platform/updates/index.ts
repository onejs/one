import type {
  UpdateManifest,
  UpdatesApi,
  UpdatesCheckResult,
  UpdatesFetchResult,
  UpdatesStagedSubscription,
} from './types'
import { assertStagedListener } from './validate'

export type {
  UpdateAsset,
  UpdateManifest,
  UpdateMetadataValue,
  UpdatesApi,
  UpdatesCheckResult,
  UpdatesFetchResult,
  UpdatesStagedSubscription,
} from './types'

// web entry. same exported names and signatures as the native entry: the
// published declarations are built from this file and serve both platforms.
// updates have no native side on web, so the reads are the empty values and
// the calls that promise an update reject. reload reloads the page.
async function check(): Promise<UpdatesCheckResult> {
  throw new Error('Updates.check needs an iOS or Android build')
}

async function fetch(): Promise<UpdatesFetchResult> {
  throw new Error('Updates.fetch needs an iOS or Android build')
}

function getStaged(): UpdateManifest | null {
  return null
}

function addStagedListener(
  listener: (staged: UpdateManifest | null) => void
): UpdatesStagedSubscription {
  assertStagedListener(listener)
  return { remove: () => {} }
}

async function reload(): Promise<void> {
  if (typeof window !== 'undefined') window.location.reload()
}

export const Updates: UpdatesApi = Object.freeze({
  isEnabled: false,
  runtimeVersion: null,
  updateId: null,
  isEmbeddedLaunch: false,
  createdAt: null,
  manifest: null,
  check,
  fetch,
  getStaged,
  addStagedListener,
  reload,
})
