import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  OneUpdates,
  OneUpdatesCheckResult,
  OneUpdatesFetchResult,
} from '../specs/OneUpdates.nitro'
import type {
  UpdateManifest,
  UpdatesApi,
  UpdatesCheckResult,
  UpdatesFetchResult,
  UpdatesStagedSubscription,
} from './types'
import { assertStagedListener, parseUpdateManifest } from './validate'

export type {
  UpdateAsset,
  UpdateManifest,
  UpdateMetadataValue,
  UpdatesApi,
  UpdatesCheckResult,
  UpdatesFetchResult,
  UpdatesStagedSubscription,
} from './types'

// over-the-air updates: the native launcher selected this bundle before
// React Native started, and the OneUpdates nitro hybrid object answers the
// running update plus check, fetch, and reload. values fixed for the
// process are read once at import and frozen: an update applies only on a
// reload, which starts a new js context. a binary without OneUpdates (an
// old build) reads disabled and its calls reject like a disabled build.
let hybrid: OneUpdates | undefined

function native(): OneUpdates {
  hybrid ??= NitroModules.createHybridObject<OneUpdates>('OneUpdates')
  return hybrid
}

const hasNative = NitroModules.hasHybridObject('OneUpdates')

function disabledError(verb: string): Error {
  return Object.assign(
    new Error(`Updates.${verb}: updates are disabled in this build.`),
    { code: 'E_UPDATES_DISABLED' }
  )
}

// native sets manifestJson exactly when an update is available.
function toCheckResult({ type, manifestJson }: OneUpdatesCheckResult): UpdatesCheckResult {
  if (type === 'available' && manifestJson !== undefined)
    return { type, manifest: parseUpdateManifest(manifestJson) }
  if (type === 'available') throw new Error('Updates.check: available without a manifest')
  return { type }
}

// native sets manifestJson exactly when an update was fetched.
function toFetchResult({ type, manifestJson }: OneUpdatesFetchResult): UpdatesFetchResult {
  if (type === 'fetched' && manifestJson !== undefined)
    return { type, manifest: parseUpdateManifest(manifestJson) }
  if (type === 'fetched') throw new Error('Updates.fetch: fetched without a manifest')
  return { type }
}

function check(): Promise<UpdatesCheckResult> {
  if (!hasNative) return Promise.reject(disabledError('check'))
  return native().check().then(toCheckResult, rethrowNativeError)
}

function fetch(): Promise<UpdatesFetchResult> {
  if (!hasNative) return Promise.reject(disabledError('fetch'))
  return native().fetch().then(toFetchResult, rethrowNativeError)
}

function getStaged(): UpdateManifest | null {
  if (!hasNative) return null
  const stagedJson = native().getStagedJson()
  return stagedJson === undefined ? null : parseUpdateManifest(stagedJson)
}

function addStagedListener(
  listener: (staged: UpdateManifest | null) => void
): UpdatesStagedSubscription {
  assertStagedListener(listener)
  if (!hasNative) return { remove: () => {} }
  const remove = native().addStagedListener((stagedJson) => {
    listener(stagedJson === undefined ? null : parseUpdateManifest(stagedJson))
  })
  return { remove: () => remove() }
}

function reload(): Promise<void> {
  if (!hasNative) return Promise.reject(disabledError('reload'))
  return native().reload().catch(rethrowNativeError)
}

function readUpdates(): UpdatesApi {
  if (!hasNative) {
    return {
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
    }
  }
  const running = native()
  const createdAt = running.createdAt
  return {
    isEnabled: running.isEnabled,
    runtimeVersion: running.runtimeVersion ?? null,
    updateId: running.updateId ?? null,
    isEmbeddedLaunch: running.isEmbeddedLaunch,
    createdAt: createdAt === undefined ? null : new Date(createdAt),
    manifest:
      running.manifestJson === undefined
        ? null
        : parseUpdateManifest(running.manifestJson),
    check,
    fetch,
    getStaged,
    addStagedListener,
    reload,
  }
}

export const Updates: UpdatesApi = Object.freeze(readUpdates())
