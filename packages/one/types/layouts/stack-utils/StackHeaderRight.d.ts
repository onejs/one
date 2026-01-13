import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
export interface StackHeaderRightProps {
    children?: ReactNode;
    asChild?: boolean;
}
/**
 * Configuration component for custom right header content.
 * Use `asChild` to render custom components in the right header area.
 */
export declare function StackHeaderRight(_props: StackHeaderRightProps): null;
export declare function appendStackHeaderRightPropsToOptions(options: NativeStackNavigationOptions, props: StackHeaderRightProps): NativeStackNavigationOptions;
//# sourceMappingURL=StackHeaderRight.d.ts.map