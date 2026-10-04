export function validateViewTag(viewTag: number): void {
  if (!Number.isInteger(viewTag) || viewTag < 1 || viewTag > 2147483647)
    throw new TypeError(
      'ScreenCapture.captureView requires a positive 32-bit integer view tag'
    )
}
