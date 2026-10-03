import { createContext, useContext } from 'react'

/**
 * @agent-rule
 * true below the native tab group. react-native-screens Tabs flips each tab
 * screen scroll view to automatic content-inset adjustment (its
 * overrideScrollViewContentInsetAdjustmentBehavior default), so the native
 * tab controller owns the status-bar and tab-bar content insets. page
 * primitives skip their manual top safe-area padding there and keep it
 * everywhere else (stack screens, auth). android has no automatic
 * adjustment, so below its tabs page primitives pad manually and also clear
 * the tab root's transparent bar by the header height.
 */
const NativeTabInsetsContext = createContext(false)

export const NativeTabInsetsProvider = NativeTabInsetsContext.Provider

export function useNativeTabInsetsOwned() {
  return useContext(NativeTabInsetsContext)
}
