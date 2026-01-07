import type { ParamListBase, StackNavigationState } from "@react-navigation/native";
import {
  type NativeStackNavigationEventMap,
  type NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
export declare const Stack: import("react").ForwardRefExoticComponent<
  Omit<
    Omit<
      import("@react-navigation/native-stack").NativeStackNavigatorProps,
      | "children"
      | "initialRouteName"
      | "layout"
      | "id"
      | "screenOptions"
      | "screenListeners"
      | "screenLayout"
      | "UNSTABLE_router"
      | "UNSTABLE_routeNamesChangeBehavior"
    > &
      import("@react-navigation/routers").DefaultRouterOptions<string> & {
        children: React.ReactNode;
        layout?:
          | ((props: {
              state: StackNavigationState<ParamListBase>;
              navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
              descriptors: Record<
                string,
                import("@react-navigation/core").Descriptor<
                  NativeStackNavigationOptions,
                  import("@react-navigation/core").NavigationProp<
                    ParamListBase,
                    string,
                    string | undefined,
                    StackNavigationState<ParamListBase>,
                    NativeStackNavigationOptions,
                    NativeStackNavigationEventMap
                  >,
                  import("@react-navigation/core").RouteProp<ParamListBase, string>
                >
              >;
              children: React.ReactNode;
            }) => React.ReactElement)
          | undefined;
        screenListeners?:
          | Partial<{
              transitionStart: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "transitionStart",
                unknown
              >;
              transitionEnd: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "transitionEnd",
                unknown
              >;
              gestureCancel: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "gestureCancel",
                unknown
              >;
              sheetDetentChange: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "sheetDetentChange",
                unknown
              >;
              focus: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "focus",
                unknown
              >;
              blur: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "blur",
                unknown
              >;
              state: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "state",
                unknown
              >;
              beforeRemove: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "beforeRemove",
                true
              >;
            }>
          | ((props: {
              route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
              navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<
                ParamListBase,
                string,
                undefined
              >;
            }) => Partial<{
              transitionStart: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "transitionStart",
                unknown
              >;
              transitionEnd: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "transitionEnd",
                unknown
              >;
              gestureCancel: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "gestureCancel",
                unknown
              >;
              sheetDetentChange: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "sheetDetentChange",
                unknown
              >;
              focus: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "focus",
                unknown
              >;
              blur: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "blur",
                unknown
              >;
              state: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "state",
                unknown
              >;
              beforeRemove: import("@react-navigation/core").EventListenerCallback<
                NativeStackNavigationEventMap &
                  import("@react-navigation/core").EventMapCore<
                    StackNavigationState<ParamListBase>
                  >,
                "beforeRemove",
                true
              >;
            }>)
          | undefined;
        screenOptions?:
          | NativeStackNavigationOptions
          | ((props: {
              route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
              navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<
                ParamListBase,
                string,
                undefined
              >;
              theme: ReactNavigation.Theme;
            }) => NativeStackNavigationOptions)
          | undefined;
        screenLayout?:
          | ((
              props: import("@react-navigation/core").ScreenLayoutArgs<
                ParamListBase,
                string,
                NativeStackNavigationOptions,
                import("@react-navigation/native-stack").NativeStackNavigationProp<
                  ParamListBase,
                  string,
                  undefined
                >
              >,
            ) => React.ReactElement)
          | undefined;
        UNSTABLE_router?:
          | (<
              Action extends Readonly<{
                type: string;
                payload?: object;
                source?: string;
                target?: string;
              }>,
            >(
              original: import("@react-navigation/routers").Router<
                StackNavigationState<ParamListBase>,
                Action
              >,
            ) => Partial<
              import("@react-navigation/routers").Router<
                StackNavigationState<ParamListBase>,
                Action
              >
            >)
          | undefined;
        UNSTABLE_routeNamesChangeBehavior?: "firstMatch" | "lastUnhandled";
      } & {
        id?: undefined;
      },
    "children"
  > &
    Partial<
      Pick<
        Omit<
          import("@react-navigation/native-stack").NativeStackNavigatorProps,
          | "children"
          | "initialRouteName"
          | "layout"
          | "id"
          | "screenOptions"
          | "screenListeners"
          | "screenLayout"
          | "UNSTABLE_router"
          | "UNSTABLE_routeNamesChangeBehavior"
        > &
          import("@react-navigation/routers").DefaultRouterOptions<string> & {
            children: React.ReactNode;
            layout?:
              | ((props: {
                  state: StackNavigationState<ParamListBase>;
                  navigation: import("@react-navigation/core").NavigationHelpers<ParamListBase, {}>;
                  descriptors: Record<
                    string,
                    import("@react-navigation/core").Descriptor<
                      NativeStackNavigationOptions,
                      import("@react-navigation/core").NavigationProp<
                        ParamListBase,
                        string,
                        string | undefined,
                        StackNavigationState<ParamListBase>,
                        NativeStackNavigationOptions,
                        NativeStackNavigationEventMap
                      >,
                      import("@react-navigation/core").RouteProp<ParamListBase, string>
                    >
                  >;
                  children: React.ReactNode;
                }) => React.ReactElement)
              | undefined;
            screenListeners?:
              | Partial<{
                  transitionStart: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "transitionStart",
                    unknown
                  >;
                  transitionEnd: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "transitionEnd",
                    unknown
                  >;
                  gestureCancel: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "gestureCancel",
                    unknown
                  >;
                  sheetDetentChange: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "sheetDetentChange",
                    unknown
                  >;
                  focus: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "focus",
                    unknown
                  >;
                  blur: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "blur",
                    unknown
                  >;
                  state: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "state",
                    unknown
                  >;
                  beforeRemove: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "beforeRemove",
                    true
                  >;
                }>
              | ((props: {
                  route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
                  navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<
                    ParamListBase,
                    string,
                    undefined
                  >;
                }) => Partial<{
                  transitionStart: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "transitionStart",
                    unknown
                  >;
                  transitionEnd: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "transitionEnd",
                    unknown
                  >;
                  gestureCancel: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "gestureCancel",
                    unknown
                  >;
                  sheetDetentChange: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "sheetDetentChange",
                    unknown
                  >;
                  focus: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "focus",
                    unknown
                  >;
                  blur: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "blur",
                    unknown
                  >;
                  state: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "state",
                    unknown
                  >;
                  beforeRemove: import("@react-navigation/core").EventListenerCallback<
                    NativeStackNavigationEventMap &
                      import("@react-navigation/core").EventMapCore<
                        StackNavigationState<ParamListBase>
                      >,
                    "beforeRemove",
                    true
                  >;
                }>)
              | undefined;
            screenOptions?:
              | NativeStackNavigationOptions
              | ((props: {
                  route: import("@react-navigation/core").RouteProp<ParamListBase, string>;
                  navigation: import("@react-navigation/native-stack").NativeStackNavigationProp<
                    ParamListBase,
                    string,
                    undefined
                  >;
                  theme: ReactNavigation.Theme;
                }) => NativeStackNavigationOptions)
              | undefined;
            screenLayout?:
              | ((
                  props: import("@react-navigation/core").ScreenLayoutArgs<
                    ParamListBase,
                    string,
                    NativeStackNavigationOptions,
                    import("@react-navigation/native-stack").NativeStackNavigationProp<
                      ParamListBase,
                      string,
                      undefined
                    >
                  >,
                ) => React.ReactElement)
              | undefined;
            UNSTABLE_router?:
              | (<
                  Action extends Readonly<{
                    type: string;
                    payload?: object;
                    source?: string;
                    target?: string;
                  }>,
                >(
                  original: import("@react-navigation/routers").Router<
                    StackNavigationState<ParamListBase>,
                    Action
                  >,
                ) => Partial<
                  import("@react-navigation/routers").Router<
                    StackNavigationState<ParamListBase>,
                    Action
                  >
                >)
              | undefined;
            UNSTABLE_routeNamesChangeBehavior?: "firstMatch" | "lastUnhandled";
          } & {
            id?: undefined;
          },
        "children"
      >
    > &
    import("react").RefAttributes<unknown>
> & {
  Screen: typeof import("../views/Screen").Screen;
};
export default Stack;
//# sourceMappingURL=Stack.d.ts.map
