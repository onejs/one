import type Arrow from '../../Arrow.js';
import type Button from '../../Button.js';
import type { ReactNode } from 'react';
import type { GestureResponderEvent, ViewStyle } from 'react-native';
export type ButtonSubProps = {
    children?: ReactNode;
    onPress?: (event: GestureResponderEvent) => void;
    disabled?: boolean;
    testID?: string;
    rippleRadius?: number;
    style?: ViewStyle;
    button?: typeof Button;
    icon?: typeof Arrow;
};
//# sourceMappingURL=types.d.ts.map