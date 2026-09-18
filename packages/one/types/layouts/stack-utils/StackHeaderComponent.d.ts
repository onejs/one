import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type ReactNode } from 'react';
import type { ColorValue, StyleProp } from 'react-native';
import type { ScreenStackHeaderConfigProps } from 'react-native-screens';
type StackHeaderStyle = {
    color?: ColorValue;
    backgroundColor?: ScreenStackHeaderConfigProps['backgroundColor'];
    shadowColor?: undefined | 'transparent';
};
type StackHeaderLargeStyle = {
    backgroundColor?: ScreenStackHeaderConfigProps['largeTitleBackgroundColor'];
    shadowColor?: undefined | 'transparent';
};
export interface StackHeaderProps {
    children?: ReactNode;
    hidden?: boolean;
    asChild?: boolean;
    blurEffect?: ScreenStackHeaderConfigProps['blurEffect'];
    style?: StyleProp<StackHeaderStyle>;
    largeStyle?: StyleProp<StackHeaderLargeStyle>;
}
/**
 * Configuration component for stack headers.
 * Use child components to configure different parts of the header.
 *
 * @example
 * ```tsx
 * <Stack.Header blurEffect="regular">
 *   <Stack.Header.Title large>My Title</Stack.Header.Title>
 *   <Stack.Header.Right asChild>
 *     <Button>Action</Button>
 *   </Stack.Header.Right>
 * </Stack.Header>
 * ```
 */
export declare function StackHeaderComponent(_props: StackHeaderProps): null;
export declare function appendStackHeaderPropsToOptions(options: NativeStackNavigationOptions, props: StackHeaderProps): NativeStackNavigationOptions;
export {};
//# sourceMappingURL=StackHeaderComponent.d.ts.map