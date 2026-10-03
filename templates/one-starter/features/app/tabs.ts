import { One, type Href } from 'one'
/**
 * @agent-rule
 * the app's tab set, declared once. the native tab layout, the web MobileTabBar,
 * and desktop navigation all render this array, so a tab cannot exist in one
 * surface and be missing from another. adding a tab is one entry here plus its
 * app/home/(tabs)/<name>/ folder with its own _layout.tsx.
 */
import { Home } from '~/interface/icons/lucide/Home'
import { User } from '~/interface/icons/lucide/User'
import {
  APP_FEED_HREF,
  APP_FEED_ROUTE_NAME,
  APP_PROFILE_HREF,
  APP_PROFILE_ROUTE_NAME,
} from './routes'
import type { Icon, SfSymbolName } from '~/interface/ui/icons/types'
import type { ComponentProps } from 'react'

export type ComposeIconName = ComponentProps<typeof One.Android.Icon>['name']

export type AppTab = {
  // must equal the route node name: a folder directly under (tabs)/ with its
  // own _layout.tsx. a bare (tabs)/<name>/index.tsx resolves to route node
  // `<name>/index` and will not match.
  name: string
  label: string
  href: Href
  // web and desktop chrome render this icon.
  icon: Icon
  // native chrome renders these symbols. without sfSymbolFocused the base
  // symbol is used in both states.
  sfSymbol: SfSymbolName
  sfSymbolFocused?: SfSymbolName
  materialSymbol: ComposeIconName
}

export const APP_TABS = [
  {
    name: APP_FEED_ROUTE_NAME,
    label: 'Feed',
    href: APP_FEED_HREF,
    icon: Home,
    sfSymbol: 'newspaper',
    sfSymbolFocused: 'newspaper.fill',
    materialSymbol: 'newspaper',
  },
  {
    name: APP_PROFILE_ROUTE_NAME,
    label: 'Profile',
    href: APP_PROFILE_HREF,
    icon: User,
    sfSymbol: 'person.crop.circle',
    sfSymbolFocused: 'person.crop.circle.fill',
    materialSymbol: 'person',
  },
] as const satisfies readonly AppTab[]

export const INITIAL_TAB_NAME = APP_TABS[0].name
