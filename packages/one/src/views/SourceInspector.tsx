import type { ReactNode } from 'react'

/**
 * SourceInspector component - the actual functionality is now injected via DevHead.tsx
 * This component is kept for backwards compatibility and returns null.
 *
 * The source inspector is automatically enabled in development mode when
 * devtools.inspector is enabled (default: true).
 *
 * Usage: Hold Shift+Cmd (Mac) or Shift+Ctrl (Windows/Linux) and hover over elements.
 */

type ModifierKey = 'Alt' | 'Control' | 'Meta' | 'Shift'
type KeyboardKey = ModifierKey | (string & {})

export type SourceInspectorProps = {
  /**
   * The hotkey combination to activate the inspector.
   * Hold these keys and hover over elements to see their source location.
   * @default ['Shift', 'Meta'] on Mac, ['Shift', 'Control'] on Windows/Linux
   * @deprecated - hotkey is now configured in the devtools script
   */
  hotkey?: KeyboardKey[]
  /**
   * Whether the source inspector is enabled
   * @default true in development
   * @deprecated - enabled status is controlled via devtools.inspector config
   */
  enabled?: boolean
}

/**
 * @deprecated - Source inspector functionality is now automatically injected.
 * This component is kept for backwards compatibility and renders nothing.
 * Remove <SourceInspector /> from your layout for cleaner code.
 */
export function SourceInspector(_props: SourceInspectorProps = {}): ReactNode {
  return null
}
