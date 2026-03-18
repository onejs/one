import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type PropsWithChildren } from 'react';
export interface StackScreenProps extends PropsWithChildren {
    name?: string;
    options?: NativeStackNavigationOptions;
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
export declare function validateStackPresentation(options: NativeStackNavigationOptions): NativeStackNavigationOptions;
export declare function validateStackPresentation<F extends (...args: never[]) => NativeStackNavigationOptions>(options: F): F;
export declare function appendScreenStackPropsToOptions(options: NativeStackNavigationOptions, props: StackScreenProps): NativeStackNavigationOptions;
//# sourceMappingURL=StackScreen.d.ts.map