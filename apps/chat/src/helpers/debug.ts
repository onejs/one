import { useCallback } from 'react'

export function debugUseState<T>(
  useState: [T, React.Dispatch<React.SetStateAction<T>>]
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState

  const wrappedSetState = useCallback(
    (newValue: T | ((prevState: T) => T)) => {
      if (typeof newValue === 'function') {
        // Handle callback style
        setState((prevState: T) => {
          const nextState = (newValue as (prevState: T) => T)(prevState)
          console.trace('State update (callback):', {
            prevState,
            nextState,
            stack: new Error().stack,
          })
          return nextState
        })
      } else {
        // Handle direct value style
        console.trace('State update (direct):', {
          prevState: state,
          nextState: newValue,
          stack: new Error().stack,
        })
        setState(newValue)
      }
    },
    [setState, state]
  )

  return [state, wrappedSetState]
}
