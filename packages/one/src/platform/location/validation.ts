import type { LocationRegion, RegionCenter } from '../specs/OneLocation.nitro'

// shared argument checks for region monitoring: identical checks and
// messages on web and native, so invalid calls throw before reaching
// native. native still guards, but does not report.
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function assertCenter(center: unknown, verb: string): asserts center is RegionCenter {
  if (!center || typeof center !== 'object') {
    throw new TypeError(`Location.${verb}: region center must be an object`)
  }
  const candidate = center as Record<string, unknown>
  if (!isFiniteNumber(candidate.latitude) || Math.abs(candidate.latitude as number) > 90) {
    throw new TypeError(
      `Location.${verb}: region center latitude must be a number from -90 to 90`
    )
  }
  if (
    !isFiniteNumber(candidate.longitude) ||
    Math.abs(candidate.longitude as number) > 180
  ) {
    throw new TypeError(
      `Location.${verb}: region center longitude must be a number from -180 to 180`
    )
  }
}

export function assertRegion(region: unknown, verb: string): asserts region is LocationRegion {
  if (!region || typeof region !== 'object') {
    throw new TypeError(`Location.${verb}: region must be an object`)
  }
  const candidate = region as Record<string, unknown>
  if (
    typeof candidate.identifier !== 'string' ||
    (candidate.identifier as string).trim() === ''
  ) {
    throw new TypeError(
      `Location.${verb}: region identifier must be a non-empty string`
    )
  }
  assertCenter(candidate.center, verb)
  if (!isFiniteNumber(candidate.radius) || (candidate.radius as number) <= 0) {
    throw new TypeError(
      `Location.${verb}: region radius must be a number greater than 0`
    )
  }
  if (
    candidate.notifyOnEntry !== undefined &&
    typeof candidate.notifyOnEntry !== 'boolean'
  ) {
    throw new TypeError(
      `Location.${verb}: region notifyOnEntry must be a boolean`
    )
  }
  if (
    candidate.notifyOnExit !== undefined &&
    typeof candidate.notifyOnExit !== 'boolean'
  ) {
    throw new TypeError(`Location.${verb}: region notifyOnExit must be a boolean`)
  }
}

export function assertIdentifier(identifier: unknown, verb: string): asserts identifier is string {
  if (typeof identifier !== 'string' || identifier.trim() === '') {
    throw new TypeError(
      `Location.${verb}: region identifier must be a non-empty string`
    )
  }
}

export function assertRegionListener(
  listener: unknown,
  verb: string
): asserts listener is (region: LocationRegion) => void {
  if (typeof listener !== 'function') {
    throw new TypeError(`Location.${verb}: listener must be a function`)
  }
}
