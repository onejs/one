import { type FunctionComponent, type ReactElement, type ReactNode } from 'react';
import type { OneRouter } from '../interfaces/router';
declare const Group: import("react").ComponentType<import("@react-navigation/core").RouteGroupConfig<import("@react-navigation/routers").ParamListBase, {}, import("@react-navigation/core").NavigationProp<import("@react-navigation/routers").ParamListBase, string, Readonly<{
    key: string;
    index: number;
    routeNames: string[];
    history?: unknown[] | undefined;
    routes: import("@react-navigation/routers").NavigationRoute<import("@react-navigation/routers").ParamListBase, string>[];
    type: string;
    stale: false;
}>, {}, {}, {}>>>;
export type ProtectedProps = {
    guard: boolean;
    /** where to redirect when `guard` is false. defaults to the navigator's first available route. */
    redirectTo?: OneRouter.Href;
    children?: ReactNode;
};
/**
 * Wrap screens in a Protected component to conditionally show/hide them based on the guard prop.
 *
 * When `guard` is `false`, the wrapped screens are filtered out and cannot be navigated to.
 * When `guard` is `true`, the wrapped screens are available for navigation.
 *
 * Works with any navigator: Stack, Tabs, Drawer, or custom Navigator.
 *
 * @example
 * ```tsx
 * import { Stack, Protected } from 'one'
 *
 * export default function Layout() {
 *   const { isAuthed } = useAuth()
 *   return (
 *     <Stack>
 *       <Stack.Screen name="login" />
 *       <Protected guard={isAuthed}>
 *         <Stack.Screen name="dashboard" />
 *         <Stack.Screen name="settings" />
 *       </Protected>
 *     </Stack>
 *   )
 * }
 * ```
 */
export declare const Protected: FunctionComponent<ProtectedProps>;
export { Group };
/**
 * Type guard to check if a React element is a Protected component with a guard prop.
 */
export declare function isProtectedElement(child: ReactNode): child is ReactElement<ProtectedProps>;
//# sourceMappingURL=Protected.d.ts.map