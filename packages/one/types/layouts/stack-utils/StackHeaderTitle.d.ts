import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { StyleProp, TextStyle } from 'react-native';
type StackHeaderTitleStyle = {
    fontFamily?: TextStyle['fontFamily'];
    fontSize?: TextStyle['fontSize'];
    fontWeight?: Exclude<TextStyle['fontWeight'], number>;
    color?: string;
    textAlign?: 'left' | 'center';
};
type StackHeaderLargeTitleStyle = Omit<StackHeaderTitleStyle, 'textAlign'>;
export type StackHeaderTitleProps = {
    children?: string;
    style?: StyleProp<StackHeaderTitleStyle>;
    largeStyle?: StyleProp<StackHeaderLargeTitleStyle>;
    large?: boolean;
};
/**
 * Configuration component for stack header title.
 * This component doesn't render anything - it's used to configure the header.
 */
export declare function StackHeaderTitle(_props: StackHeaderTitleProps): null;
export declare function appendStackHeaderTitlePropsToOptions(options: NativeStackNavigationOptions, props: StackHeaderTitleProps): NativeStackNavigationOptions;
export {};
//# sourceMappingURL=StackHeaderTitle.d.ts.map