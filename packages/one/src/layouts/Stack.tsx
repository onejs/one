import type { ParamListBase, StackNavigationState } from '@react-navigation/native'
import {
  createNativeStackNavigator,
  type NativeStackNavigationEventMap,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import React, { Children, useMemo, type ComponentProps } from 'react'

import {
  StackScreen,
  StackHeader,
  StackHeaderComponent,
  StackHeaderSearchBar,
  appendScreenStackPropsToOptions,
  type StackScreenProps,
} from './stack-utils'
import { withLayoutContext } from './withLayoutContext'
import { isChildOfType } from '../utils/children'
import { Protected } from '../views/Protected'
import { Screen } from '../views/Screen'

const NativeStackNavigator = createNativeStackNavigator().Navigator

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
        return (
          <Protected key={`protected-${index}`} guard={child.props.guard}>
            {mapChildren(child.props.children)}
          </Protected>
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

/**
 * Stack navigator with support for Header Composition API.
 * Wraps the base Stack to pre-process StackScreen children.
 */
const StackWithComposition = React.forwardRef<unknown, ComponentProps<typeof RNStack>>(
  (props, ref) => {
    const { children, screenOptions, ...rest } = props

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

    return (
      <RNStack {...rest} ref={ref} screenOptions={screenOptionsWithHeader}>
        {processedChildren}
      </RNStack>
    )
  }
)

export const Stack = Object.assign(StackWithComposition, {
  Screen: StackScreen,
  Header: StackHeader,
  Protected,
  SearchBar: StackHeaderSearchBar,
})

export default Stack
