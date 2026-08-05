import {
  Activity,
  type ComponentProps,
  Fragment,
  type ReactElement,
  useState,
} from 'react'
import type { ScreenContainer } from 'react-native-screens'

import { useNavigatorContext } from '../views/Navigator'
import { TabContext, type TabsDescriptor } from './TabContext'
import type { TabListProps } from './TabList'

export type TabSlotProps = ComponentProps<typeof ScreenContainer> & {
  /** Remove inactive screens from the visible DOM tree. */
  detachInactiveScreens?: boolean
  /** Override how each screen is rendered. */
  renderFn?: typeof defaultTabsSlotRender
}

export type TabsSlotRenderOptions = {
  index: number
  isFocused: boolean
  loaded: boolean
  detachInactiveScreens: boolean
}

export function useTabSlot({
  detachInactiveScreens = true,
  renderFn = defaultTabsSlotRender,
}: TabSlotProps = {}) {
  const { state, descriptorsRef } = useNavigatorContext()
  const descriptors = descriptorsRef.current
  const focusedRouteKey = state.routes[state.index].key
  const [loaded, setLoaded] = useState({ [focusedRouteKey]: true })

  if (!loaded[focusedRouteKey]) {
    setLoaded({ ...loaded, [focusedRouteKey]: true })
  }

  return (
    <Fragment>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key] as unknown as TabsDescriptor

        return (
          <TabContext.Provider key={descriptor.route.key} value={descriptor.options}>
            {renderFn(descriptor, {
              index,
              isFocused: state.index === index,
              loaded: loaded[route.key],
              detachInactiveScreens,
            })}
          </TabContext.Provider>
        )
      })}
    </Fragment>
  )
}

export function TabSlot(props: TabSlotProps) {
  return useTabSlot(props)
}

export function defaultTabsSlotRender(
  descriptor: TabsDescriptor,
  { isFocused, loaded, detachInactiveScreens }: TabsSlotRenderOptions
) {
  const { lazy = true, unmountOnBlur } = descriptor.options

  if ((unmountOnBlur || detachInactiveScreens) && !isFocused) return null
  if (lazy && !loaded && !isFocused) return null

  if (!isFocused) {
    return (
      <Activity key={descriptor.route.key} mode="hidden">
        {descriptor.render()}
      </Activity>
    )
  }

  return <Fragment key={descriptor.route.key}>{descriptor.render()}</Fragment>
}

/**
 * @hidden
 */
export function isTabSlot(child: ReactElement<any>): child is ReactElement<TabListProps> {
  return child.type === TabSlot
}
