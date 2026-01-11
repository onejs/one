import { useEffect } from 'react'
import { setLastAction } from '../router/lastAction'
import { subscribeToLoadingState, subscribeToRootState } from '../router/router'

const KEY = 'one-sr'
const GROUP_KEY = 'one-sr-groups'

const getState = () => JSON.parse(sessionStorage.getItem(KEY) || '{}')
const getGroupState = () => JSON.parse(sessionStorage.getItem(GROUP_KEY) || '{}')

// prevent scroll to top on first load
let isFirstLoad = true

// Active scroll groups - defined by layouts
let activeGroups: Set<string> = new Set()

/**
 * Scroll Position Groups allow layouts to preserve their scroll position
 * independently of child route changes. This is useful for:
 * - Tab layouts where switching tabs shouldn't reset parent scroll
 * - Side panels where main content scroll is preserved
 * - Any nested layout that wants independent scroll restoration
 */
export function registerScrollGroup(groupId: string) {
  activeGroups.add(groupId)
  return () => {
    activeGroups.delete(groupId)
  }
}

function getGroupKey(pathname: string): string | null {
  // Find the longest matching group for this pathname
  let longestMatch: string | null = null
  for (const group of activeGroups) {
    if (
      pathname.startsWith(group) &&
      (!longestMatch || group.length > longestMatch.length)
    ) {
      longestMatch = group
    }
  }
  return longestMatch
}

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

function restoreGroupPosition(groupId: string) {
  try {
    const positions = getGroupState()
    const saved = positions[groupId]
    if (typeof saved === 'number') {
      setTimeout(() => {
        window.scrollTo(0, saved)
      })
    }
  } catch (error) {
    console.error(`Error restoring scroll position for group ${groupId}`, error)
    sessionStorage.removeItem(GROUP_KEY)
  }
}

let didPop = false
let previousPathname: string | null = null

function rememberScrollPosition() {
  didPop = false
  const pathname = window.location.pathname

  // Save standard per-path scroll position
  const state = getState()
  state[pathname] = window.scrollY
  sessionStorage.setItem(KEY, JSON.stringify(state))

  // Also save for any active scroll group
  const groupKey = getGroupKey(pathname)
  if (groupKey) {
    const groupState = getGroupState()
    groupState[groupKey] = window.scrollY
    sessionStorage.setItem(GROUP_KEY, JSON.stringify(groupState))
  }

  previousPathname = pathname
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
      previousPathname = window.location.pathname
      return
    }

    if (state.linkOptions?.scroll === false) {
      return
    }

    const { hash } = state
    const currentPathname = window.location.pathname

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
      // Check if we're navigating within a scroll group
      // If both previous and current paths are in the same group, restore group position
      const prevGroup = previousPathname ? getGroupKey(previousPathname) : null
      const currentGroup = getGroupKey(currentPathname)

      if (prevGroup && currentGroup && prevGroup === currentGroup) {
        // Same scroll group - restore the group's scroll position
        restoreGroupPosition(currentGroup)
      } else if (state.linkOptions?.scrollGroup) {
        // Custom scroll group specified in link options
        restoreGroupPosition(state.linkOptions.scrollGroup)
      } else {
        // Different group or no group - scroll to top
        window.scrollTo(0, 0)
      }
    }

    previousPathname = currentPathname
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
  if (process.env.VITE_ENVIRONMENT === 'client') {
    useEffect(() => {
      if (window.location.hash) {
        scrollToHash(window.location.hash)
      }
    }, [])

    useEffect(() => {
      return configure(props)
    }, [props.disable])
  }

  return null
}
