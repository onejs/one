import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type StyleProp, type TextStyle } from 'react-native';
export type StackHeaderTitleProps = {
    children?: string;
    style?: StyleProp<{
        fontFamily?: TextStyle['fontFamily'];
        fontSize?: TextStyle['fontSize'];
        fontWeight?: Exclude<TextStyle['fontWeight'], number>;
        color?: string;
        textAlign?: 'left' | 'center';
    }>;
    largeStyle?: StyleProp<{
        fontFamily?: TextStyle['fontFamily'];
        fontSize?: TextStyle['fontSize'];
        fontWeight?: Exclude<TextStyle['fontWeight'], number>;
        color?: string;
    }>;
    large?: boolean;
};
/**
 * Configuration component for stack header title.
 * This component doesn't render anything - it's used to configure the header.
 */
export declare function StackHeaderTitle(_props: StackHeaderTitleProps): null;
export declare function appendStackHeaderTitlePropsToOptions(options: NativeStackNavigationOptions, props: StackHeaderTitleProps): NativeStackNavigationOptions;
//# sourceMappingURL=StackHeaderTitle.d.ts.map