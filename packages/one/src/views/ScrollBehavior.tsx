import { useEffect } from 'react'
import { setLastAction } from '../router/lastAction'
import { subscribeToLoadingState, subscribeToRootState } from '../router/router'

const KEY = 'one-sr'

const getState = () => JSON.parse(sessionStorage.getItem(KEY) || '{}')

// prevent scroll to top on first load
let isFirstLoad = true

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

type ScrollBehaviorProps = {
  disable?: boolean | 'restore'
}

let disable: (() => void) | null = null

function configure(props: ScrollBehaviorProps) {
  if (typeof window === 'undefined' || !window.addEventListener) {
    return
  }

  disable?.()

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
    if (state === 'loading') {
      rememberScrollPosition()
    }
  })

  const disposeOnRootState = subscribeToRootState((state) => {
    if (isFirstLoad) {
      isFirstLoad = false
      return
    }

    if (state.linkOptions?.scroll === false) {
      return
    }

    const { hash } = state

    if (hash) {
      setTimeout(() => {
        scrollToHash(hash)
      })
    } else if (didPop) {
      if (props.disable !== 'restore') {
        // for now only restore on back button
        restorePosition()
      }
    } else {
      // if new page just set back to top
      window.scrollTo(0, 0)
    }
  })

  disable = () => {
    popStateController.abort()
    disposeOnLoadState()
    disposeOnRootState()
  }

  return disable!
}

function scrollToHash(hash: string) {
  if (!hash || !hash.startsWith('#')) return
  const id = hash.slice(1)
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'instant' })
}

export function ScrollBehavior(props: ScrollBehaviorProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash) {
      scrollToHash(window.location.hash)
    }
  }, [])

  useEffect(() => {
    return configure(props)
  }, [props.disable])

  return null
}
