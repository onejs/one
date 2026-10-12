import { EscapeHatch } from '../native-source/EscapeHatch.kt'

export async function runNativePayloads(): Promise<string> {
  const pinned = await EscapeHatch.pin({ x: 1, y: 2 })
  const labeled = await EscapeHatch.pin({ x: 3, y: 4, label: 'named' })
  const heading = await EscapeHatch.heading('NORTH')
  const at = await EscapeHatch.at(new Date('2026-01-01T00:00:00.123Z'))
  const blob = await EscapeHatch.blob(new Uint8Array([0, 1, 128, 255]))
  return JSON.stringify({
    // mirror the existing iOS receipt for an omitted optional key.
    pinned: { ...pinned, label: pinned.label ?? null },
    labeled,
    heading,
    at: at instanceof Date ? at.toISOString() : typeof at,
    blob: blob instanceof Uint8Array ? Array.from(blob) : typeof blob,
  })
}

export async function runNativePayloadsInvalid(): Promise<string> {
  // a string where a Date belongs throws before the call leaves JavaScript
  await EscapeHatch.at('yesterday' as unknown as Date)
  return 'invalid call did not throw'
}
