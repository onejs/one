import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type ReactNode } from 'react';
import { type ColorValue, type StyleProp } from 'react-native';
import type { ScreenStackHeaderConfigProps } from 'react-native-screens';
export interface StackHeaderProps {
    children?: ReactNode;
    hidden?: boolean;
    asChild?: boolean;
    blurEffect?: ScreenStackHeaderConfigProps['blurEffect'];
    style?: StyleProp<{
        color?: ColorValue;
        backgroundColor?: ScreenStackHeaderConfigProps['backgroundColor'];
        shadowColor?: undefined | 'transparent';
    }>;
    largeStyle?: StyleProp<{
        backgroundColor?: ScreenStackHeaderConfigProps['largeTitleBackgroundColor'];
        shadowColor?: undefined | 'transparent';
    }>;
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
//# sourceMappingURL=StackHeaderComponent.d.ts.map