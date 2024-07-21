import { useEffect } from 'react'
import {
  lastUserRouteAction,
  subscribeToLoadingState,
  subscribeToRootState,
} from '../router/router'

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

export function ScrollRestoration() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let isInitial = true

    window.addEventListener('popstate', () => {
      didPop = true
    })

    const disposeOnLoadState = subscribeToLoadingState((state) => {
      if (Date.now() - lastUserRouteAction > 1) {
        // this isn't a state change due to a link press, ignore
        return
      }

      if (state === 'loading') {
        rememberScrollPosition()
      }
    })

    const disposeOnRootState = subscribeToRootState((state) => {
      if (Date.now() - lastUserRouteAction > 1) {
        // this isn't a state change due to a link press, ignore
        return
      }

      if (isInitial) {
        isInitial = false
        return
      }

      if (state.linkOptions?.scroll === false) {
        return
      }

      if (didPop) {
        // for now only restore on back button
        restorePosition()
      } else {
        // if new page just set back to top
        window.scrollTo(0, 0)
      }
    })

    return () => {
      disposeOnLoadState()
      disposeOnRootState()
    }
  }, [])

  return null
}
