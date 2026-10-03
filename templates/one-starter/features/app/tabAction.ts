/**
 * @agent-rule
 * each tab's primary action, drawn beside the tab bar for whichever tab is
 * focused: the native tab layout renders it as the ios 27 prominent tab (a
 * glass circle trailing the tab pill), ~/interface/ui's MobileTabBar draws the
 * same circle at phone-width web, and the desktop header shows it as its
 * accent button. a tab root screen declares its own with useTabAction; a tab
 * that declares none shows no action and the pill centers. the action is that
 * tab's primary action, so the screen draws no button of its own for it. it is
 * skill.
 */
import { usePathname } from 'one'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { APP_TABS, type ComposeIconName } from './tabs'
import type { SfSymbolName } from '~/interface/ui/icons/types'
import type { MobileTabBarAction } from '~/interface/ui/tabs/MobileTabBar'

// the web circle's fields (label, href, optional onPress, icon) come from
// ~/interface/ui's MobileTabBar; native adds one glyph per platform, with no
// label beside it in the circle.
export type AppTabAction = Omit<MobileTabBarAction, 'testID'> & {
  sfSymbol: SfSymbolName
  materialSymbol: ComposeIconName
}

const actions = new Map<string, AppTabAction>()
const listeners = new Set<() => void>()
let version = 0

function publish() {
  version++
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// declares the action of the tab `tab` (its APP_TABS name) while the calling
// screen is mounted. onPress always runs the latest render's handler.
export function useTabAction(tab: string, action: AppTabAction) {
  const onPress = useRef(action.onPress)
  onPress.current = action.onPress
  const { label, href, icon, sfSymbol, materialSymbol } = action
  useEffect(() => {
    actions.set(tab, {
      label,
      href,
      icon,
      sfSymbol,
      materialSymbol,
      onPress: () => onPress.current?.(),
    })
    publish()
    return () => {
      actions.delete(tab)
      publish()
    }
  }, [tab, label, href, icon, sfSymbol, materialSymbol])
}

// the focused tab's action, or null when it declares none. its testID is
// `<tab>-primary-action`, the id a screen's declared action is found by.
export function useFocusedTabAction(): (AppTabAction & { testID: string }) | null {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  )
  const pathname = usePathname()
  const tab = APP_TABS.find(
    (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  )
  const action = tab ? actions.get(tab.name) : undefined
  return tab && action ? { ...action, testID: `${tab.name}-primary-action` } : null
}
