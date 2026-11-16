import { useState } from 'react'
import { isRestoredLaunch } from './router/warmState'

/**
 * true for a screen that mounted as part of a launch `router.restore` reopened,
 * false for screens opened after that. stable for the life of the screen.
 */
export function useIsRestored(): boolean {
  const [restored] = useState(isRestoredLaunch)
  return restored
}
