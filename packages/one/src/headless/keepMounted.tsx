'use client'

import { Activity, Fragment, useEffect, useState } from 'react'

import type { ScreenEntry } from './types'

/**
 * Tabs and Drawer hold every route in navigation state from the start, so a
 * `keepMounted` screen must only stay mounted once it has actually been
 * focused. Matches react-navigation's lazy behavior on native.
 */
export function useVisitedScreens(focusedKey: string) {
  const [visited, setVisited] = useState<string[]>(() => [focusedKey])

  useEffect(() => {
    setVisited((prev) => (prev.includes(focusedKey) ? prev : [...prev, focusedKey]))
  }, [focusedKey])

  return visited
}

export function renderKeptMountedScreens(screens: ScreenEntry[], visited: string[]) {
  return (
    <Fragment>
      {screens.map((screen) => {
        if (screen.isFocused) {
          return screen.keepMounted ? (
            <Activity key={screen.key} mode="visible">
              {screen.element}
            </Activity>
          ) : (
            <Fragment key={screen.key}>{screen.element}</Fragment>
          )
        }

        if (!screen.keepMounted || !visited.includes(screen.key)) return null

        return (
          <Activity key={screen.key} mode="hidden">
            {screen.element}
          </Activity>
        )
      })}
    </Fragment>
  )
}
