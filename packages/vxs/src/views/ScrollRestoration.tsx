import { useEffect } from 'react'
import { store } from '../router/router-store'

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

export function rememberScrollPosition() {
  didPop = false
  const state = getState()
  state[window.location.pathname] = window.scrollY
  sessionStorage.setItem(KEY, JSON.stringify(state))
}

export function ScrollRestoration() {
  useEffect(() => {
    let isInitial = true

    window.addEventListener('popstate', () => {
      didPop = true
    })

    store.subscribeToRootState(() => {
      if (isInitial) {
        isInitial = false
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
  }, [])

  return null
}
