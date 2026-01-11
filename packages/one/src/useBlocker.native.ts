import { useNavigation } from '@react-navigation/native'
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
 * On native, this uses React Navigation's `beforeRemove` event to prevent navigation.
 * Note that this only works for navigation within the app - it cannot prevent
 * the app from being closed or backgrounded.
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
  const [pendingEvent, setPendingEvent] = React.useState<any>(null)
  const [blockedLocation, setBlockedLocation] = React.useState<string | null>(null)

  const shouldBlockRef = React.useRef(shouldBlock)
  shouldBlockRef.current = shouldBlock

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const currentShouldBlock = shouldBlockRef.current

      // Get the next location from the action payload
      const payload = e.data?.action?.payload as { name?: string } | undefined
      const nextLocation = payload?.name || 'previous screen'

      // Determine if we should block
      const block =
        typeof currentShouldBlock === 'function'
          ? currentShouldBlock({
              currentLocation: '', // Not easily available on native
              nextLocation,
              historyAction: 'pop',
            })
          : currentShouldBlock

      if (!block) {
        return
      }

      // Prevent default behavior (leaving the screen)
      e.preventDefault()

      // Store the event to dispatch later if user confirms
      setPendingEvent(e)
      setBlockedLocation(nextLocation)
      setState('blocked')
    })

    return unsubscribe
  }, [navigation])

  const reset = React.useCallback(() => {
    setPendingEvent(null)
    setBlockedLocation(null)
    setState('unblocked')
  }, [])

  const proceed = React.useCallback(() => {
    if (!pendingEvent) return

    setState('proceeding')

    // Dispatch the original action to complete navigation
    navigation.dispatch(pendingEvent.data.action)

    // Reset after navigation
    setTimeout(() => {
      setPendingEvent(null)
      setBlockedLocation(null)
      setState('unblocked')
    }, 100)
  }, [navigation, pendingEvent])

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
 * No-op on native - native uses React Navigation's beforeRemove event instead.
 * This is only used by the router on web.
 */
export function checkBlocker(
  _nextLocation: string,
  _historyAction: 'push' | 'pop' | 'replace' = 'push'
): boolean {
  return false
}
