import type { LinkingOptions, ParamListBase, PartialRoute, Route } from "@react-navigation/native";
import type { ExpoTabActionType } from "./TabRouter";
import type { UrlObject } from "../router/getNormalizedStatePath";
import type { RouteNode } from "../router/Route";
import type { OneRouter } from "../interfaces/router";
import { Slot } from "./Slot";
export declare const ViewSlot: Slot<
  import("react-native").ViewProps,
  import("react").Component<import("react-native").ViewProps, {}, any>
>;
export type ScreenTrigger =
  | {
      type: "internal";
      href: OneRouter.Href;
      name: string;
    }
  | {
      type: "external";
      name: string;
      href: string;
    };
type JumpToNavigationAction = Extract<
  ExpoTabActionType,
  {
    type: "JUMP_TO";
  }
>;
type TriggerConfig =
  | {
      type: "internal";
      name: string;
      href: string;
      routeNode: RouteNode;
      action: JumpToNavigationAction;
    }
  | {
      type: "external";
      name: string;
      href: string;
    };
export type TriggerMap = Record<
  string,
  TriggerConfig & {
    index: number;
  }
>;
export declare function triggersToScreens(
  triggers: ScreenTrigger[],
  layoutRouteNode: RouteNode,
  linking: LinkingOptions<ParamListBase>,
  initialRouteName: undefined | string,
  parentTriggerMap: TriggerMap,
  routeInfo: UrlObject,
  contextKey: string,
): {
  children: import("react").JSX.Element[];
  triggerMap: TriggerMap;
};
export declare function stateToAction(
  state: PartialRoute<Route<string, object | undefined>> | undefined,
  startAtRoute?: string,
): JumpToNavigationAction;
export {};
//# sourceMappingURL=common.d.ts.map
