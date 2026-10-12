export function validateDefinition(identifier: string, handler: unknown): void {
  if (
    typeof identifier !== 'string' ||
    !identifier.trim() ||
    typeof handler !== 'function'
  )
    throw new TypeError('BackgroundTasks.defineTask requires an identifier and handler')
}

export function validateSubmission(
  identifier: string,
  earliestBeginDateMs?: number
): void {
  if (!identifier.trim())
    throw new TypeError('BackgroundTasks.submit requires an identifier')
  if (
    earliestBeginDateMs !== undefined &&
    (!Number.isFinite(earliestBeginDateMs) || earliestBeginDateMs < 0)
  )
    throw new RangeError('BackgroundTasks.submit earliestBeginDateMs must be a timestamp')
}

export function validateCancellation(identifier: string): void {
  if (!identifier.trim())
    throw new TypeError('BackgroundTasks.cancel requires an identifier')
}
