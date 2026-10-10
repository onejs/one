import type { UpdateAsset, UpdateManifest, UpdateMetadataValue } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAsset(value: unknown): value is UpdateAsset {
  return (
    isRecord(value) &&
    typeof value.hash === 'string' &&
    typeof value.url === 'string' &&
    typeof value.path === 'string'
  )
}

function isMetadataValue(value: unknown): value is UpdateMetadataValue {
  const type = typeof value
  return type === 'string' || type === 'number' || type === 'boolean'
}

// native hands the manifest over as the json it downloaded and verified.
// parse it into the public shape here so every reader shares one schema.
export function parseUpdateManifest(json: string): UpdateManifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Updates: received a manifest that is not valid json.')
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.id !== 'string' ||
    typeof parsed.createdAt !== 'string' ||
    typeof parsed.runtimeVersion !== 'string' ||
    !isAsset(parsed.launchAsset) ||
    !Array.isArray(parsed.assets) ||
    !parsed.assets.every(isAsset) ||
    !isRecord(parsed.metadata) ||
    !Object.values(parsed.metadata).every(isMetadataValue) ||
    Number.isNaN(Date.parse(parsed.createdAt))
  ) {
    throw new Error('Updates: received a manifest with an unexpected shape.')
  }
  const assets: UpdateAsset[] = []
  for (const asset of parsed.assets) {
    if (isAsset(asset)) assets.push(asset)
  }
  const metadata: Record<string, UpdateMetadataValue> = {}
  for (const [key, value] of Object.entries(parsed.metadata)) {
    if (isMetadataValue(value)) metadata[key] = value
  }
  return {
    id: parsed.id,
    createdAt: parsed.createdAt,
    runtimeVersion: parsed.runtimeVersion,
    launchAsset: parsed.launchAsset,
    assets,
    metadata,
  }
}

export function assertStagedListener(
  listener: (staged: UpdateManifest | null) => void
): void {
  if (typeof listener !== 'function') {
    throw new Error('Updates.addStagedListener: listener must be a function.')
  }
}
