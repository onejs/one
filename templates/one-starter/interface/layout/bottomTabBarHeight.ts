import { createContext, useContext } from 'react'

/**
 * @agent-rule
 * height of the web bottom tab bar in the current layout, published by the tab
 * group and added by each scrolling container to its own bottom padding. the
 * bar is fixed, so it overlays the page, and padding a wrapper around the
 * scroller is dropped from the scroll extent: the clearance only works inside
 * the box that scrolls. the value is 0 outside a tab group, and a group whose
 * bar hides at a breakpoint publishes 0 there. each layout decides whether its
 * own bar is visible; this hook only carries the number. native tab controllers
 * own their content insets and do not use this context.
 */
const BottomTabBarHeightContext = createContext(0)

export const BottomTabBarHeightProvider = BottomTabBarHeightContext.Provider

export function useBottomTabBarHeight() {
  return useContext(BottomTabBarHeightContext)
}
