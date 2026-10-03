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
  StackToolbarBadge,
  StackToolbarButton,
  StackToolbarComponent,
  StackToolbarIcon,
  StackToolbarLabel,
  StackToolbarMenu,
  StackToolbarMenuAction,
  StackToolbarSearchBarSlot,
  StackToolbarSpacer,
  appendStackToolbarPropsToOptions,
  type StackScreenOptions,
  type StackScreenProps,
  type StackToolbarProps,
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

      if (isChildOfType(child, StackToolbarComponent)) {
        // Stack.Toolbar at the Stack level is used for screenOptions, handled separately
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
    // extract Stack.Header / Stack.Toolbar from children for screenOptions
    const screenOptionsWithHeader = useMemo(() => {
      const stackHeader = Children.toArray(children).find((child) =>
        isChildOfType(child, StackHeaderComponent)
      )
      const stackToolbars = Children.toArray(children).filter((child) =>
        isChildOfType(child, StackToolbarComponent)
      )

      if (!stackHeader && !stackToolbars.length) return screenOptions

      const applyComposition = (opts: StackScreenOptions) => {
        // each toolbar declares one placement; apply all so left and right compose.
        let result = opts as NativeStackNavigationOptions
        for (const stackToolbar of stackToolbars) {
          result = appendStackToolbarPropsToOptions(
            result,
            (stackToolbar as { props: StackToolbarProps }).props
          )
        }
        if (stackHeader && isChildOfType(stackHeader, StackHeaderComponent)) {
          const headerProps: StackScreenProps = { children: stackHeader }
          result = appendScreenStackPropsToOptions(
            result as StackScreenOptions,
            headerProps
          ) as NativeStackNavigationOptions
        }
        return result
      }

      if (screenOptions) {
        if (typeof screenOptions === 'function') {
          return (...args: Parameters<typeof screenOptions>) => {
            const opts = screenOptions(...args)
            return applyComposition(opts as StackScreenOptions)
          }
        }
        return applyComposition(screenOptions as StackScreenOptions)
      }
      return applyComposition({})
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

type StackToolbarCompound = typeof StackToolbarComponent & {
  Button: typeof StackToolbarButton
  Menu: typeof StackToolbarMenu
  MenuAction: typeof StackToolbarMenuAction
  Spacer: typeof StackToolbarSpacer
  SearchBarSlot: typeof StackToolbarSearchBarSlot
  Label: typeof StackToolbarLabel
  Icon: typeof StackToolbarIcon
  Badge: typeof StackToolbarBadge
}

type StackType = ReturnType<typeof withLayoutContext> & {
  Screen: typeof StackScreen
  Header: typeof StackHeader
  Toolbar: StackToolbarCompound
  Protected: typeof Protected
  SearchBar: typeof StackHeaderSearchBar
}

const StackToolbar = Object.assign(StackToolbarComponent, {
  Button: StackToolbarButton,
  Menu: StackToolbarMenu,
  MenuAction: StackToolbarMenuAction,
  Spacer: StackToolbarSpacer,
  SearchBarSlot: StackToolbarSearchBarSlot,
  Label: StackToolbarLabel,
  Icon: StackToolbarIcon,
  Badge: StackToolbarBadge,
}) as StackToolbarCompound

export const Stack: StackType = Object.assign(StackWithComposition, {
  Screen: StackScreen,
  Header: StackHeader,
  Toolbar: StackToolbar,
  Protected,
  SearchBar: StackHeaderSearchBar,
}) as StackType

export default Stack
