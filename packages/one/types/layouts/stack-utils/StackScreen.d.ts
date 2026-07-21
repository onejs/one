import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type PropsWithChildren } from 'react';
export type StackScreenOptions = Omit<NativeStackNavigationOptions, 'presentation'> & {
    presentation?: NativeStackNavigationOptions['presentation'] | 'sheet' | (string & {});
    /**
     * Web-only. When `true`, the route's React subtree stays mounted across
     * dismissal and re-navigation - `useState`, `useId`, `useReducer`, refs,
     * and anything stored in the route component all survive.
     *
     * Caveat: route params are captured at first mount. If the same route is
     * navigated to with different params later, the captured subtree keeps
     * the original params. Best for stable, parameter-free overlays
     * (settings, persistent filters, command palettes). For routes with
     * dynamic params, leave `keepMounted` off.
     */
    keepMounted?: boolean;
};
export interface StackScreenProps extends PropsWithChildren {
    name?: string;
    options?: StackScreenOptions;
}
/**
 * Stack screen component with support for compositional header configuration.
 *
 * @example
 * ```tsx
 * <Stack.Screen name="home" options={{ title: 'Home' }}>
 *   <Stack.Header>
 *     <Stack.Header.Title large>Welcome</Stack.Header.Title>
 *     <Stack.Header.SearchBar placeholder="Search..." />
 *   </Stack.Header>
 * </Stack.Screen>
 * ```
 */
export declare function StackScreen({ children, options, ...rest }: StackScreenProps): import("react/jsx-runtime").JSX.Element;
export declare function validateStackPresentation(options: StackScreenOptions): StackScreenOptions;
export declare function validateStackPresentation<F extends (...args: never[]) => StackScreenOptions>(options: F): F;
export declare function appendScreenStackPropsToOptions(options: StackScreenOptions, props: StackScreenProps): StackScreenOptions;
//# sourceMappingURL=StackScreen.d.ts.map