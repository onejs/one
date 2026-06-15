import { useNavigation, usePreventRemove } from '@react-navigation/native'
import * as React from 'react'

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
 * Block navigation when a condition is met.
 *
 * On native, this uses React Navigation's `usePreventRemove`, which registers the
 * route with the native stack so the iOS interactive swipe-back gesture is blocked
 * too (via `preventNativeDismiss`), not just JS-driven pops. A raw `beforeRemove`
 * listener only stops JS-driven pops, so swiping would bypass the guard and desync
 * JS<->native state. Note that this only works for navigation within the app - it
 * cannot prevent the app from being closed or backgrounded.
 *
 * @param shouldBlock - Either a boolean or a function that returns whether to block.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const [isDirty, setIsDirty] = useState(false)
 *   const blocker = useBlocker(isDirty)
 *
 *   return (
 *     <>
 *       <TextInput onChange={() => setIsDirty(true)} />
 *
 *       {blocker.state === 'blocked' && (
 *         <Modal>
 *           <Text>You have unsaved changes. Leave anyway?</Text>
 *           <Button title="Stay" onPress={blocker.reset} />
 *           <Button title="Leave" onPress={blocker.proceed} />
 *         </Modal>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function useBlocker(shouldBlock: BlockerFunction | boolean): Blocker {
  const navigation = useNavigation()
  const [state, setState] = React.useState<BlockerState>('unblocked')
  const [pendingAction, setPendingAction] = React.useState<any>(null)
  const [blockedLocation, setBlockedLocation] = React.useState<string | null>(null)

  // native has no current location and the gesture/back button are always a pop
  const block =
    typeof shouldBlock === 'function'
      ? shouldBlock({
          currentLocation: '',
          nextLocation: 'previous screen',
          historyAction: 'pop',
        })
      : shouldBlock

  usePreventRemove(block, ({ data }) => {
    const payload = data?.action?.payload as { name?: string } | undefined
    setPendingAction(data.action)
    setBlockedLocation(payload?.name || 'previous screen')
    setState('blocked')
  })

  const reset = React.useCallback(() => {
    setPendingAction(null)
    setBlockedLocation(null)
    setState('unblocked')
  }, [])

  const proceed = React.useCallback(() => {
    if (!pendingAction) return

    setState('proceeding')

    // the captured action carries a VISITED_ROUTE_KEYS marker, so re-dispatching
    // it skips the beforeRemove guard and navigation completes without re-blocking
    navigation.dispatch(pendingAction)

    setTimeout(() => {
      setPendingAction(null)
      setBlockedLocation(null)
      setState('unblocked')
    }, 100)
  }, [navigation, pendingAction])

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

/**
 * No-op on native - native uses React Navigation's usePreventRemove instead.
 * This is only used by the router on web.
 */
export function checkBlocker(
  _nextLocation: string,
  _historyAction: 'push' | 'pop' | 'replace' = 'push'
): boolean {
  return false
}
