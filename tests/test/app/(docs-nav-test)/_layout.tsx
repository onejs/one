import { Slot } from 'one'

/**
 * Outer layout for docs navigation test route group.
 * Just wraps with Slot - the interesting layout is in docs/_layout.tsx
 */
export default function DocsNavTestGroupLayout() {
  return <Slot />
}
