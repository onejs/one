import type { EventMapBase, NavigationState } from "@react-navigation/native";
import React from "react";
import { type ScreenProps } from "../router/useScreens";
import type { PickPartial } from "../types";
import { Screen } from "../views/Screen";
export declare function useFilterScreenChildren(
  children: React.ReactNode,
  {
    isCustomNavigator,
    contextKey,
  }?: {
    isCustomNavigator?: boolean;
    /** Used for sending developer hints */
    contextKey?: string;
  },
): {
  screens: ScreenProps[] | undefined;
  children: any[];
};
/** Return a navigator that automatically injects matched routes and renders nothing when there are no children. Return type with children prop optional */
export declare function withLayoutContext<
  TOptions extends object,
  T extends React.ComponentType<any>,
  State extends NavigationState,
  EventMap extends EventMapBase,
>(
  Nav: T,
  processor?: (
    options: ScreenProps<TOptions, State, EventMap>[],
  ) => ScreenProps<TOptions, State, EventMap>[],
  options?: {
    props: any;
  },
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PickPartial<React.ComponentProps<T>, "children">> &
    React.RefAttributes<unknown>
> & {
  Screen: typeof Screen;
};
//# sourceMappingURL=withLayoutContext.d.ts.map
