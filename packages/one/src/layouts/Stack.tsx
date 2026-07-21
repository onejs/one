import type { ParamListBase, StackNavigationState } from '@react-navigation/native'
import {
  type NativeStackNavigationEventMap,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import React, { Children, useMemo, type ComponentProps } from 'react'

import {
  StackScreen,
  StackHeader,
  StackHeaderComponent,
  StackHeaderSearchBar,
  StackToolbar,
  appendScreenStackPropsToOptions,
  type StackScreenProps,
} from './stack-utils'
import { withLayoutContext } from './withLayoutContext'
import { isChildOfType } from '../utils/children'
import { Protected } from '../views/Protected'
import { Screen } from '../views/Screen'
import { createStackNavigator } from './stack-navigator'
import { StackRenderProvider, type StackRender } from '../router/web/ScreenRenderContext'
import { getRenderingConfig } from '../router/renderingRegistry'

const NativeStackNavigator = createStackNavigator().Navigator

const RNStack = withLayoutContext<
  NativeStackNavigationOptions,
  typeof NativeStackNavigator,
  StackNavigationState<ParamListBase>,
  NativeStackNavigationEventMap
>(NativeStackNavigator)

/**
 * Pre-process children to convert StackScreen (with Header children) to Screen (with options).
 * This allows the Header Composition API to work in layout files.
 */
function mapChildren(children: React.ReactNode): React.ReactNode {
  return Children.toArray(children)
    .map((child, index) => {
      if (isChildOfType(child, StackScreen)) {
        // convert StackScreen to Screen with options extracted from Header children
        const options = appendScreenStackPropsToOptions({}, child.props)
        const { children: _, ...rest } = child.props
        return <Screen key={child.props.name ?? index} {...rest} options={options} />
      }

      if (isChildOfType(child, Protected)) {
        // recursively process Protected children
        return React.cloneElement(
          child,
          { key: `protected-${index}` },
          mapChildren(child.props.children)
        )
      }

      if (isChildOfType(child, StackHeaderComponent)) {
        // Stack.Header at the Stack level is used for screenOptions, handled separately
        return null
      }

      // pass through other children (like Screen)
      return child
    })
    .filter(Boolean)
}

type StackExtraProps = {
  /**
   * Platform-keyed render component for overlay routes (modal / formSheet /
   * pageSheet / transparentModal / fullScreenModal). v1 consumes `web` only;
   * `ios` / `android` are reserved for future use. Per-route overrides go on
   * `<Stack.Screen options={{ render }} />`.
   */
  render?: StackRender
}

/**
 * Stack navigator with support for Header Composition API.
 * Wraps the base Stack to pre-process StackScreen children.
 */
const StackWithComposition = React.forwardRef<
  unknown,
  ComponentProps<typeof RNStack> & StackExtraProps
>((props, ref) => {
  const { children, screenOptions, render, ...rest } = props

  // extract Stack.Header from children for screenOptions
  const screenOptionsWithHeader = useMemo(() => {
    const stackHeader = Children.toArray(children).find((child) =>
      isChildOfType(child, StackHeaderComponent)
    )

    if (stackHeader && isChildOfType(stackHeader, StackHeaderComponent)) {
      const headerProps: StackScreenProps = { children: stackHeader }
      if (screenOptions) {
        if (typeof screenOptions === 'function') {
          return (...args: Parameters<typeof screenOptions>) => {
            const opts = screenOptions(...args)
            return appendScreenStackPropsToOptions(opts, headerProps)
          }
        }
        return appendScreenStackPropsToOptions(screenOptions, headerProps)
      }
      return appendScreenStackPropsToOptions({}, headerProps)
    }

    return screenOptions
  }, [children, screenOptions])

  // pre-process children to convert StackScreen to Screen
  const processedChildren = useMemo(() => mapChildren(children), [children])

  const navigator = (
    <RNStack {...rest} ref={ref} screenOptions={screenOptionsWithHeader}>
      {processedChildren}
    </RNStack>
  )

  // Per-instance prop wins; otherwise fall back to setupRendering global.
  const effectiveRender = render ?? getRenderingConfig().Stack
  if (!effectiveRender) return navigator
  return <StackRenderProvider value={effectiveRender}>{navigator}</StackRenderProvider>
})

export const Stack = Object.assign(StackWithComposition, {
  Screen: StackScreen,
  Header: StackHeader,
  Protected,
  SearchBar: StackHeaderSearchBar,
  Toolbar: StackToolbar,
})

export default Stack
