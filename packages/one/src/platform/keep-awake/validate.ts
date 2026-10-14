// keep runtime argument errors identical on web and native.
export function assertKeepAwakeEnabled(value: unknown): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error('KeepAwake.setEnabled: enabled must be a boolean')
  }
}

// expo's default tag, used when activate/deactivate omit one.
export const keepAwakeDefaultTag = 'ExpoKeepAwakeDefaultTag'

export function assertKeepAwakeTag(
  value: unknown,
  owner: 'activate' | 'deactivate' | 'useKeepAwake'
): asserts value is string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw new Error(`KeepAwake.${owner}: tag must be a string`)
  }
}

export function normalizeKeepAwakeTag(value: string | undefined): string {
  return value ?? keepAwakeDefaultTag
}
