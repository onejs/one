import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { ImageSourcePropType } from 'react-native';
import type { ScreenStackHeaderConfigProps } from 'react-native-screens';
export interface StackHeaderBackButtonProps {
    children?: string;
    style?: NativeStackNavigationOptions['headerBackTitleStyle'];
    withMenu?: boolean;
    displayMode?: ScreenStackHeaderConfigProps['backButtonDisplayMode'];
    hidden?: boolean;
    src?: ImageSourcePropType;
}
/**
 * Configuration component for the back button in stack headers.
 */
export declare function StackHeaderBackButton(_props: StackHeaderBackButtonProps): null;
export declare function appendStackHeaderBackButtonPropsToOptions(options: NativeStackNavigationOptions, props: StackHeaderBackButtonProps): NativeStackNavigationOptions;
//# sourceMappingURL=StackHeaderBackButton.d.ts.map