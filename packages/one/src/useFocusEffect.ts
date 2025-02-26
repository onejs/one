// A fork of `useFocusEffect` that waits for the navigation state to load before
// running the effect. This is especially useful for native redirects.

import { useEffect } from 'react'
import { useOptionalNavigation } from './link/useLoadedNavigation'

type EffectCallback = () => undefined | void | (() => void)

/**
 * Hook to run an effect in a focused screen, similar to `React.useEffect`.
 * This can be used to perform side-effects such as fetching data or subscribing to events.
 *
 * @param callback Memoized callback containing the effect, should optionally return a cleanup function.
 */
export function useFocusEffect(effect: EffectCallback, args: any[]) {
  const navigation = useOptionalNavigation()

  useEffect(() => {
    if (!navigation) {
      return
    }

    let isFocused = false
    let cleanup: undefined | void | (() => void)

    const callback = () => {
      const destroy = effect()

      if (destroy === undefined || typeof destroy === 'function') {
        return destroy
      }

      if (process.env.NODE_ENV !== 'production') {
        let message =
          'An effect function must not return anything besides a function, which is used for clean-up.'

        if (destroy === null) {
          message +=
            " You returned 'null'. If your effect does not require clean-up, return 'undefined' (or nothing)."
        } else if (typeof (destroy as any).then === 'function') {
          message +=
            "\n\nIt looks like you wrote 'useFocusEffect(async () => ...)' or returned a Promise. " +
            'Instead, write the async function inside your effect ' +
            'and call it immediately:\n\n' +
            'useFocusEffect(\n' +
            '  React.useCallback(() => {\n' +
            '    async function fetchData() {\n' +
            '      // You can await here\n' +
            '      const response = await MyAPI.getData(someId);\n' +
            '      // ...\n' +
            '    }\n\n' +
            '    fetchData();\n' +
            '  }, [someId])\n' +
            ');\n\n' +
            'See usage guide: https://reactnavigation.org/docs/use-focus-effect'
        } else {
          message += ` You returned '${JSON.stringify(destroy)}'.`
        }

        console.error(message)
      }
    }

    // We need to run the effect on intial render/dep changes if the screen is focused
    if (navigation.isFocused()) {
      cleanup = callback()
      isFocused = true
    }

    const unsubscribeFocus = navigation.addListener('focus', () => {
      // If callback was already called for focus, avoid calling it again
      // The focus event may also fire on intial render, so we guard against runing the effect twice
      if (isFocused) return
      cleanup?.()
      cleanup = callback()
      isFocused = true
    })

    const unsubscribeBlur = navigation.addListener('blur', () => {
      cleanup?.()
      cleanup = undefined
      isFocused = false
    })

    return () => {
      cleanup?.()
      unsubscribeFocus()
      unsubscribeBlur()
    }
  }, [navigation, ...args])
}
