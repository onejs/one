import type { ParamListBase, StackNavigationState } from '@react-navigation/native'
import type {
  NativeStackNavigationEventMap,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import React, { Children, type ComponentProps, useMemo } from 'react'
import { isChildOfType } from '../utils/children'
import { Protected } from '../views/Protected'
import { Screen } from '../views/Screen'
import { createStackNavigator, getStackNavigatorProps } from './stack-navigator'
import {
  appendScreenStackPropsToOptions,
  StackHeader,
  StackHeaderComponent,
  StackHeaderSearchBar,
  StackScreen,
  type StackScreenProps,
  StackToolbar,
} from './stack-utils'
import { withLayoutContext } from './withLayoutContext'

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

      if (isChildOfType(child, Screen)) {
        return child
      }

      return null
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
    const navigatorProps = useMemo(() => getStackNavigatorProps(children), [children])

    return (
      <RNStack
        {...rest}
        {...navigatorProps}
        ref={ref}
        screenOptions={
          screenOptionsWithHeader as ComponentProps<typeof RNStack>['screenOptions']
        }
      >
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
  Toolbar: StackToolbar,
})

export default Stack
