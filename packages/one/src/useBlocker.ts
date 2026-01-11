import * as React from 'react'
import { Platform } from 'react-native'

export type BlockerState = 'unblocked' | 'blocked' | 'proceeding'

export type BlockerFunction = (args: {
  currentLocation: string
  nextLocation: string
  historyAction: 'push' | 'pop' | 'replace'
}) => boolean

export type Blocker =
  | {
      state: 'unblocked'
      reset?: undefined
      proceed?: undefined
      location?: undefined
    }
  | {
      state: 'blocked'
      reset: () => void
      proceed: () => void
      location: string
    }
  | {
      state: 'proceeding'
      reset?: undefined
      proceed?: undefined
      location: string
    }

/**
 * Stored pending navigation that was blocked.
 * We need to restore it when the user confirms.
 */
type PendingNavigation = {
  previousLocation: string
  nextLocation: string
  historyAction: 'push' | 'pop' | 'replace'
}

// Global state for blocking
let currentLocation =
  typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''
let isBlocking = false
let isProceeding = false
let pendingNavigation: PendingNavigation | null = null

// Active blocker callbacks
const blockerCallbacks = new Map<
  symbol,
  {
    shouldBlock: () => boolean
    onBlock: (pending: PendingNavigation) => void
    onProceed: () => void
    onReset: () => void
  }
>()

// Track if global listeners are set up
let listenersSetup = false

function setupListeners() {
  if (listenersSetup || typeof window === 'undefined') return
  listenersSetup = true

  // Track current location on page load
  currentLocation = window.location.pathname + window.location.search

  // Listen for popstate (browser back/forward)
  window.addEventListener('popstate', () => {
    if (isProceeding) return

    const nextLocation = window.location.pathname + window.location.search

    // Check if any blocker wants to block
    for (const [, callbacks] of blockerCallbacks) {
      if (callbacks.shouldBlock()) {
        // Block the navigation
        isBlocking = true
        pendingNavigation = {
          previousLocation: currentLocation,
          nextLocation,
          historyAction: 'pop',
        }

        // Restore the previous URL immediately using history.forward() or history.back()
        // We pushed a state when we got here, so we need to go back
        window.history.go(1) // Go forward to restore

        // Notify the blocker
        callbacks.onBlock(pendingNavigation)
        return
      }
    }

    // No blocking, update current location
    currentLocation = nextLocation
  })

  // Intercept pushState and replaceState
  const originalPushState = window.history.pushState.bind(window.history)
  const originalReplaceState = window.history.replaceState.bind(window.history)

  window.history.pushState = function (state, title, url) {
    if (isProceeding || !url) {
      return originalPushState(state, title, url)
    }

    const nextLocation = typeof url === 'string' ? url : url.toString()

    for (const [, callbacks] of blockerCallbacks) {
      if (callbacks.shouldBlock()) {
        isBlocking = true
        pendingNavigation = {
          previousLocation: currentLocation,
          nextLocation,
          historyAction: 'push',
        }
        callbacks.onBlock(pendingNavigation)
        return // Don't call original
      }
    }

    currentLocation = nextLocation
    return originalPushState(state, title, url)
  }

  window.history.replaceState = function (state, title, url) {
    if (isProceeding || !url) {
      return originalReplaceState(state, title, url)
    }

    const nextLocation = typeof url === 'string' ? url : url.toString()

    for (const [, callbacks] of blockerCallbacks) {
      if (callbacks.shouldBlock()) {
        isBlocking = true
        pendingNavigation = {
          previousLocation: currentLocation,
          nextLocation,
          historyAction: 'replace',
        }
        callbacks.onBlock(pendingNavigation)
        return // Don't call original
      }
    }

    currentLocation = nextLocation
    return originalReplaceState(state, title, url)
  }

  // Handle beforeunload (page close/refresh)
  window.addEventListener('beforeunload', (event) => {
    for (const [, callbacks] of blockerCallbacks) {
      if (callbacks.shouldBlock()) {
        event.preventDefault()
        event.returnValue = ''
        return
      }
    }
  })
}

/**
 * Block navigation when a condition is met.
 *
 * This is useful for preventing users from accidentally leaving a page with unsaved changes.
 * Works with both browser navigation (back/forward, URL changes) and programmatic navigation.
 *
 * @param shouldBlock - Either a boolean or a function that returns whether to block.
 *   When using a function, you receive the current and next locations and can make dynamic decisions.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const [isDirty, setIsDirty] = useState(false)
 *   const blocker = useBlocker(isDirty)
 *
 *   return (
 *     <>
 *       <form onChange={() => setIsDirty(true)}>
 *         {// form fields}
 *       </form>
 *
 *       {blocker.state === 'blocked' && (
 *         <Dialog>
 *           <p>You have unsaved changes. Leave anyway?</p>
 *           <button onClick={blocker.reset}>Stay</button>
 *           <button onClick={blocker.proceed}>Leave</button>
 *         </Dialog>
 *       )}
 *     </>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Function-based blocking with location info
 * const blocker = useBlocker(({ currentLocation, nextLocation }) => {
 *   // Only block when leaving this specific section
 *   return currentLocation.startsWith('/edit') && !nextLocation.startsWith('/edit')
 * })
 * ```
 */
export function useBlocker(shouldBlock: BlockerFunction | boolean): Blocker {
  const [state, setState] = React.useState<BlockerState>('unblocked')
  const [blockedLocation, setBlockedLocation] = React.useState<string | null>(null)
  const idRef = React.useRef<symbol | null>(null)

  const shouldBlockRef = React.useRef(shouldBlock)
  shouldBlockRef.current = shouldBlock

  React.useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web' || typeof window === 'undefined') return

    setupListeners()

    const id = Symbol('blocker')
    idRef.current = id

    blockerCallbacks.set(id, {
      shouldBlock: () => {
        const block = shouldBlockRef.current
        if (typeof block === 'function') {
          return block({
            currentLocation,
            nextLocation: pendingNavigation?.nextLocation || '',
            historyAction: pendingNavigation?.historyAction || 'push',
          })
        }
        return block
      },
      onBlock: (pending) => {
        setBlockedLocation(pending.nextLocation)
        setState('blocked')
      },
      onProceed: () => {
        setState('proceeding')
      },
      onReset: () => {
        setState('unblocked')
        setBlockedLocation(null)
      },
    })

    return () => {
      blockerCallbacks.delete(id)
    }
  }, [])

  const reset = React.useCallback(() => {
    isBlocking = false
    pendingNavigation = null
    setBlockedLocation(null)
    setState('unblocked')
  }, [])

  const proceed = React.useCallback(() => {
    if (!pendingNavigation) return

    setState('proceeding')
    isProceeding = true

    const pending = pendingNavigation
    pendingNavigation = null
    isBlocking = false

    // Execute the blocked navigation
    requestAnimationFrame(() => {
      if (pending.historyAction === 'pop') {
        // Go back to where the user wanted to go
        window.history.back()
      } else if (pending.historyAction === 'push') {
        window.history.pushState(null, '', pending.nextLocation)
      } else {
        window.history.replaceState(null, '', pending.nextLocation)
      }

      currentLocation = pending.nextLocation

      // Reset state after navigation
      requestAnimationFrame(() => {
        isProceeding = false
        setBlockedLocation(null)
        setState('unblocked')
      })
    })
  }, [])

  if (state === 'unblocked') {
    return { state: 'unblocked' }
  }

  if (state === 'proceeding') {
    return { state: 'proceeding', location: blockedLocation! }
  }

  return {
    state: 'blocked',
    reset,
    proceed,
    location: blockedLocation!,
  }
}
