// centralized re-exports — uses @react-navigation/core instead of native
// to avoid the native → react-native chain that fails in Node ESM during `one serve`
// core has everything we need except LinkingContext (client-only, imported lazily)

export {
  getActionFromState,
  StackActions,
  StackRouter,
  TabRouter,
  useNavigation,
  useNavigationBuilder,
  useNavigationContainerRef,
  useNavigationIndependentTree,
} from '@react-navigation/core'

// types are erased at compile time — safe to import from native
export type {
  CommonNavigationAction,
  DefaultNavigatorOptions,
  DocumentTitleOptions,
  DrawerNavigationState,
  EventMapBase,
  LinkingOptions,
  LocaleDirection,
  NavigationContainerRef,
  NavigationContainerRefWithCurrent,
  NavigationProp,
  NavigationState,
  ParamListBase,
  PartialState,
  Router,
  RouterFactory,
  StackNavigationState,
  StackRouterOptions,
  TabActionHelpers,
  TabActionType,
  TabNavigationState,
  TabRouterOptions,
} from '@react-navigation/native'
