import { useIsFocused } from '@react-navigation/core'
import { useContext, useEffect, useLayoutEffect } from 'react'
import { RouteInfoContext } from '../router/RouteInfoContext'
import { setLastAction } from '../router/lastAction'
import {
  routeInfo,
  subscribeToLoadingState,
  subscribeToRootState,
} from '../router/router'

const KEY = 'one-sr'
const GROUP_KEY = 'one-sr-groups'

const getState = () => JSON.parse(sessionStorage.getItem(KEY) || '{}')
const getGroupState = () => JSON.parse(sessionStorage.getItem(GROUP_KEY) || '{}')

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
      (pathname === group || pathname.startsWith(`${group}/`)) &&
      (!longestMatch || group.length > longestMatch.length)
    ) {
      longestMatch = group
    }
  }
  return longestMatch
}

function restorePosition(pathname: string) {
  try {
    const positions = getState()
    const saved = positions[pathname]
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
let pendingScroll: { href: string; apply: () => void } | null = null
let committedHref: string | undefined

// a leaf screen commits this marker with its page, after any route suspension.
export function ScrollBehaviorRouteCommit() {
  const info = useContext(RouteInfoContext)
  const href = info?.unstable_globalHref
  const focused = useIsFocused()

  useLayoutEffect(() => {
    if (!focused) return
    committedHref = href
    if (pendingScroll && pendingScroll.href === href) {
      const { apply } = pendingScroll
      pendingScroll = null
      apply()
    }
  })

  return null
}

function configure(props: ScrollBehaviorProps) {
  if (typeof window === 'undefined' || !window.addEventListener) {
    return
  }

  disable?.()

  // routeInfo carries no hash, so the mount comparison below is pathname+search
  const initialLocation = `${window.location.pathname}${window.location.search}`
  let isFirstStateChange = true
  let handledLocation = initialLocation
  previousPathname = window.location.pathname

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
    // updateState refreshes routeInfo and then notifies these subscribers, all
    // before react-navigation's linking listener writes the new URL. so
    // window.location here still reports the route being left, and the router's
    // own route info is the only current view of where we just navigated to.
    const currentHref = routeInfo?.unstable_globalHref ?? ''
    const currentPathname = routeInfo?.pathname ?? ''

    if (isFirstStateChange) {
      isFirstStateChange = false

      // Depending on navigator mount timing, the initial state notification may
      // happen before or after this effect subscribes. Only ignore it when the
      // router is still on the route where ScrollBehavior mounted. Otherwise this
      // is the first real navigation and must receive normal scroll handling.
      if (currentHref === initialLocation) {
        return
      }
    }

    const { hash } = state
    const location = `${currentHref}${hash || ''}`
    if (location === handledLocation) {
      pendingScroll = null
      return
    }

    pendingScroll = null
    if (state.linkOptions?.scroll === false) {
      handledLocation = location
      previousPathname = currentPathname
      return
    }

    const restoring = didPop
    const prevGroup = previousPathname ? getGroupKey(previousPathname) : null
    const currentGroup = getGroupKey(currentPathname)
    const scrollGroup = state.linkOptions?.scrollGroup

    // route info publishes optimistically. apply scrolling only after the
    // matching leaf screen commits its content.
    pendingScroll = {
      href: currentHref,
      apply: () => {
        handledLocation = location
        previousPathname = currentPathname
        if (hash) {
          scrollToHash(hash)
        } else if (restoring) {
          if (props.disable !== 'restore') {
            restorePosition(currentPathname)
          }
        } else if (prevGroup && currentGroup && prevGroup === currentGroup) {
          restoreGroupPosition(currentGroup)
        } else if (scrollGroup) {
          restoreGroupPosition(scrollGroup)
        } else {
          window.scrollTo(0, 0)
        }
      },
    }

    if (committedHref === currentHref) {
      const { apply } = pendingScroll
      pendingScroll = null
      apply()
    }
  })

  disable = () => {
    pendingScroll = null
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
