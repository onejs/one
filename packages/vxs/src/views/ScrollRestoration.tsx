import { useEffect } from 'react'
import { getLastAction, setLastAction } from '../router/lastAction'
import { subscribeToLoadingState, subscribeToRootState } from '../router/router'

const KEY = 'vxs-sr'

const getState = () => JSON.parse(sessionStorage.getItem(KEY) || '{}')

function restorePosition() {
  try {
    const positions = getState()
    const saved = positions[window.location.pathname]
    if (typeof saved === 'number') {
      setTimeout(() => {
        window.scrollTo(0, saved)
      })
    }
  } catch (error) {
    console.error(`Error restoring scroll position`, error)
    sessionStorage.removeItem(KEY)
  }
}

let didPop = false

function rememberScrollPosition() {
  didPop = false
  const state = getState()
  state[window.location.pathname] = window.scrollY
  sessionStorage.setItem(KEY, JSON.stringify(state))
}

export function ScrollRestoration(props: {
  disable?: boolean | 'restore'
}) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) {
      return
    }
    if (props.disable) {
      return
    }

    let isInitial = true

    const popStateController = new AbortController()

    window.addEventListener(
      'popstate',
      () => {
        didPop = true
        setLastAction()
      },
      {
        signal: popStateController.signal,
      }
    )

    const disposeOnLoadState = subscribeToLoadingState((state) => {
      if (Date.now() - getLastAction() > 100) {
        // this isn't a state change due to a link press or back, ignore
        return
      }

      if (state === 'loading') {
        rememberScrollPosition()
      }
    })

    const disposeOnRootState = subscribeToRootState((state) => {
      if (Date.now() - getLastAction() > 100) {
        // this isn't a state change due to a link press, ignore
        return
      }

      if (state.linkOptions?.scroll === false) {
        return
      }

      if (didPop) {
        if (props.disable !== 'restore') {
          // for now only restore on back button
          restorePosition()
        }
      } else {
        // if new page just set back to top
        window.scrollTo(0, 0)
      }
    })

    return () => {
      popStateController.abort()
      disposeOnLoadState()
      disposeOnRootState()
    }
  }, [props.disable])

  return null
}
