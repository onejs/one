export function validateViewTag(viewTag: number): void {
  if (!Number.isInteger(viewTag) || viewTag < 1 || viewTag > 2147483647)
    throw new TypeError(
      'ScreenCapture.captureView requires a positive 32-bit integer view tag'
    )
}

export const preventDefaultKey = 'default'

export function assertPreventKey(
  key: unknown,
  verb: 'prevent' | 'allow'
): asserts key is string {
  if (typeof key !== 'string' || key.length === 0)
    throw new TypeError(`ScreenCapture.${verb} requires a non-empty string key`)
}
