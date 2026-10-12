// keep runtime argument errors identical on web and native.
export function assertPrintFileUri(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Print.printPdf: fileUri must be a non-empty string')
  }
}

export function assertPrintJobName(value: unknown): asserts value is string | undefined {
  if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
    throw new Error('Print.printPdf: jobName must be a non-empty string when provided')
  }
}
