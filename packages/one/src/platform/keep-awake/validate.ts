// keep runtime argument errors identical on web and native.
export function assertKeepAwakeEnabled(value: unknown): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error('KeepAwake.setEnabled: enabled must be a boolean')
  }
}
