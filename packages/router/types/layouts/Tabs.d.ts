/// <reference types="react" />
import {
  type BottomTabNavigationEventMap,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import type { ExpoRouter } from '../../src/interfaces/router'
export declare const Tabs: import('react').ForwardRefExoticComponent<
  Omit<
    Omit<
      import('@react-navigation/routers').DefaultRouterOptions<string> & {
        id?: string | undefined
        children: import('react').ReactNode
        screenListeners?:
          | Partial<{
              tabPress: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'tabPress'
              >
              tabLongPress: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'tabLongPress'
              >
              focus: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'focus'
              >
              blur: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'blur'
              >
              state: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'state'
              >
              beforeRemove: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'beforeRemove'
              >
            }>
          | ((props: {
              route: import('@react-navigation/core').RouteProp<ParamListBase, string>
              navigation: any
            }) => Partial<{
              tabPress: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'tabPress'
              >
              tabLongPress: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'tabLongPress'
              >
              focus: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'focus'
              >
              blur: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'blur'
              >
              state: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'state'
              >
              beforeRemove: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'beforeRemove'
              >
            }>)
          | undefined
        screenOptions?:
          | BottomTabNavigationOptions
          | ((props: {
              route: import('@react-navigation/core').RouteProp<ParamListBase, string>
              navigation: any
            }) => BottomTabNavigationOptions)
          | undefined
      } & import('@react-navigation/routers').DefaultRouterOptions & {
          backBehavior?:
            | import('@react-navigation/routers/lib/typescript/src/TabRouter').BackBehavior
            | undefined
        } & import('@react-navigation/bottom-tabs/lib/typescript/src/types').BottomTabNavigationConfig,
      'initialRouteName' | 'children' | 'id' | 'screenListeners' | 'screenOptions'
    > &
      import('@react-navigation/routers').DefaultRouterOptions<string> & {
        id?: string | undefined
        children: import('react').ReactNode
        screenListeners?:
          | Partial<{
              tabPress: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'tabPress'
              >
              tabLongPress: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'tabLongPress'
              >
              focus: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'focus'
              >
              blur: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'blur'
              >
              state: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'state'
              >
              beforeRemove: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'beforeRemove'
              >
            }>
          | ((props: {
              route: import('@react-navigation/core').RouteProp<ParamListBase, string>
              navigation: any
            }) => Partial<{
              tabPress: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'tabPress'
              >
              tabLongPress: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'tabLongPress'
              >
              focus: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'focus'
              >
              blur: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'blur'
              >
              state: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'state'
              >
              beforeRemove: import('@react-navigation/core').EventListenerCallback<
                BottomTabNavigationEventMap &
                  import('@react-navigation/core').EventMapCore<TabNavigationState<ParamListBase>>,
                'beforeRemove'
              >
            }>)
          | undefined
        screenOptions?:
          | BottomTabNavigationOptions
          | ((props: {
              route: import('@react-navigation/core').RouteProp<ParamListBase, string>
              navigation: any
            }) => BottomTabNavigationOptions)
          | undefined
      },
    'children'
  > &
    Partial<
      Pick<
        Omit<
          import('@react-navigation/routers').DefaultRouterOptions<string> & {
            id?: string | undefined
            children: import('react').ReactNode
            screenListeners?:
              | Partial<{
                  tabPress: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'tabPress'
                  >
                  tabLongPress: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'tabLongPress'
                  >
                  focus: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'focus'
                  >
                  blur: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'blur'
                  >
                  state: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'state'
                  >
                  beforeRemove: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'beforeRemove'
                  >
                }>
              | ((props: {
                  route: import('@react-navigation/core').RouteProp<ParamListBase, string>
                  navigation: any
                }) => Partial<{
                  tabPress: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'tabPress'
                  >
                  tabLongPress: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'tabLongPress'
                  >
                  focus: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'focus'
                  >
                  blur: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'blur'
                  >
                  state: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'state'
                  >
                  beforeRemove: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'beforeRemove'
                  >
                }>)
              | undefined
            screenOptions?:
              | BottomTabNavigationOptions
              | ((props: {
                  route: import('@react-navigation/core').RouteProp<ParamListBase, string>
                  navigation: any
                }) => BottomTabNavigationOptions)
              | undefined
          } & import('@react-navigation/routers').DefaultRouterOptions & {
              backBehavior?:
                | import('@react-navigation/routers/lib/typescript/src/TabRouter').BackBehavior
                | undefined
            } & import('@react-navigation/bottom-tabs/lib/typescript/src/types').BottomTabNavigationConfig,
          'initialRouteName' | 'children' | 'id' | 'screenListeners' | 'screenOptions'
        > &
          import('@react-navigation/routers').DefaultRouterOptions<string> & {
            id?: string | undefined
            children: import('react').ReactNode
            screenListeners?:
              | Partial<{
                  tabPress: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'tabPress'
                  >
                  tabLongPress: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'tabLongPress'
                  >
                  focus: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'focus'
                  >
                  blur: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'blur'
                  >
                  state: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'state'
                  >
                  beforeRemove: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'beforeRemove'
                  >
                }>
              | ((props: {
                  route: import('@react-navigation/core').RouteProp<ParamListBase, string>
                  navigation: any
                }) => Partial<{
                  tabPress: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'tabPress'
                  >
                  tabLongPress: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'tabLongPress'
                  >
                  focus: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'focus'
                  >
                  blur: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'blur'
                  >
                  state: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'state'
                  >
                  beforeRemove: import('@react-navigation/core').EventListenerCallback<
                    BottomTabNavigationEventMap &
                      import('@react-navigation/core').EventMapCore<
                        TabNavigationState<ParamListBase>
                      >,
                    'beforeRemove'
                  >
                }>)
              | undefined
            screenOptions?:
              | BottomTabNavigationOptions
              | ((props: {
                  route: import('@react-navigation/core').RouteProp<ParamListBase, string>
                  navigation: any
                }) => BottomTabNavigationOptions)
              | undefined
          },
        'children'
      >
    > &
    import('react').RefAttributes<unknown>
> & {
  Screen: (
    props: import('../../src/useScreens').ScreenProps<
      import('@react-navigation/elements').HeaderOptions & {
        title?: string | undefined
        tabBarLabel?:
          | string
          | ((props: {
              focused: boolean
              color: string
              position: import('@react-navigation/bottom-tabs/lib/typescript/src/types').LabelPosition
              children: string
            }) => import('react').ReactNode)
          | undefined
        tabBarShowLabel?: boolean | undefined
        tabBarLabelPosition?:
          | import('@react-navigation/bottom-tabs/lib/typescript/src/types').LabelPosition
          | undefined
        tabBarLabelStyle?: import('react-native').StyleProp<import('react-native').TextStyle>
        tabBarAllowFontScaling?: boolean | undefined
        tabBarIcon?:
          | ((props: {
              focused: boolean
              color: string
              size: number
            }) => import('react').ReactNode)
          | undefined
        tabBarIconStyle?: import('react-native').StyleProp<import('react-native').TextStyle>
        tabBarBadge?: string | number | undefined
        tabBarBadgeStyle?: import('react-native').StyleProp<import('react-native').TextStyle>
        tabBarAccessibilityLabel?: string | undefined
        tabBarTestID?: string | undefined
        tabBarButton?:
          | ((
              props: import('@react-navigation/bottom-tabs').BottomTabBarButtonProps
            ) => import('react').ReactNode)
          | undefined
        tabBarActiveTintColor?: string | undefined
        tabBarInactiveTintColor?: string | undefined
        tabBarActiveBackgroundColor?: string | undefined
        tabBarInactiveBackgroundColor?: string | undefined
        tabBarItemStyle?: import('react-native').StyleProp<import('react-native').ViewStyle>
        tabBarHideOnKeyboard?: boolean | undefined
        tabBarVisibilityAnimationConfig?:
          | {
              show?:
                | import('@react-navigation/bottom-tabs/lib/typescript/src/types').TabBarVisibilityAnimationConfig
                | undefined
              hide?:
                | import('@react-navigation/bottom-tabs/lib/typescript/src/types').TabBarVisibilityAnimationConfig
                | undefined
            }
          | undefined
        tabBarStyle?:
          | false
          | import('react-native').RegisteredStyle<import('react-native').ViewStyle>
          | import('react-native').Animated.Value
          | import('react-native').Animated.AnimatedInterpolation<string | number>
          | import('react-native').Animated.WithAnimatedObject<import('react-native').ViewStyle>
          | import('react-native').Animated.WithAnimatedArray<
              | import('react-native').Falsy
              | import('react-native').ViewStyle
              | import('react-native').RegisteredStyle<import('react-native').ViewStyle>
              | import('react-native').RecursiveArray<
                  | import('react-native').Falsy
                  | import('react-native').ViewStyle
                  | import('react-native').RegisteredStyle<import('react-native').ViewStyle>
                >
              | readonly (
                  | import('react-native').Falsy
                  | import('react-native').ViewStyle
                  | import('react-native').RegisteredStyle<import('react-native').ViewStyle>
                )[]
            >
          | null
          | undefined
        tabBarBackground?: (() => import('react').ReactNode) | undefined
        lazy?: boolean | undefined
        header?:
          | ((
              props: import('@react-navigation/bottom-tabs').BottomTabHeaderProps
            ) => import('react').ReactNode)
          | undefined
        headerShown?: boolean | undefined
        unmountOnBlur?: boolean | undefined
        freezeOnBlur?: boolean | undefined
      } & {
        href?: ExpoRouter.Href | null | undefined
      },
      TabNavigationState<ParamListBase>,
      BottomTabNavigationEventMap
    >
  ) => null
}
export default Tabs
//# sourceMappingURL=Tabs.d.ts.map
