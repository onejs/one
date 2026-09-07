/**
 * Deterministic hash algorithm matching Reanimated / React Native Worklets.
 */
export function calculateWorkletHash(str: string): number {
  let i = str.length
  let hash1 = 5381
  let hash2 = 52711
  while (i--) {
    const char = str.charCodeAt(i)
    hash1 = (hash1 * 33) ^ char
    hash2 = (hash2 * 33) ^ char
  }
  return (hash1 >>> 0) * 4096 + (hash2 >>> 0)
}
