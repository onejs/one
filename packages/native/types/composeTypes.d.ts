import type { ColorValue, StyleProp, ViewProps, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import type { ComposeIconName } from './generated/composeIcons';
export type { ComposeIconName } from './generated/composeIcons';
export type ComposeStyle = Readonly<{
    backgroundColor?: ColorValue;
    foregroundColor?: ColorValue;
    padding?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    width?: number;
    height?: number;
    fillMaxWidth?: boolean;
    fillMaxHeight?: boolean;
    cornerRadius?: number;
    opacity?: number;
    borderColor?: ColorValue;
    borderWidth?: number;
}>;
export type ComposeHorizontalAlignment = 'start' | 'centerHorizontally' | 'end';
export type ComposeVerticalAlignment = 'top' | 'centerVertically' | 'bottom';
export type ComposeContentAlignment = 'topStart' | 'topCenter' | 'topEnd' | 'centerStart' | 'center' | 'centerEnd' | 'bottomStart' | 'bottomCenter' | 'bottomEnd' | 'top' | 'bottom' | 'start' | 'end';
export type ComposeVerticalArrangement = 'top' | 'center' | 'bottom' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly';
export type ComposeHorizontalArrangement = 'start' | 'center' | 'end' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly';
export type ComposeTextAlign = 'unspecified' | 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
export type ComposeFontWeight = 'thin' | 'extraLight' | 'light' | 'normal' | 'medium' | 'semiBold' | 'bold' | 'extraBold' | 'black';
export type ComposeAccessibilityRole = 'button' | 'switch' | 'header' | 'text';
export interface ComposeNodeProps extends Pick<ViewProps, 'accessibilityLabel' | 'accessibilityState' | 'accessibilityValue' | 'testID'> {
    children?: ReactNode;
    accessibilityRole?: ComposeAccessibilityRole;
    style?: StyleProp<ViewStyle>;
    composeStyle?: ComposeStyle;
}
export interface ComposeColumnProps extends ComposeNodeProps {
    horizontalAlignment?: ComposeHorizontalAlignment;
    verticalArrangement?: ComposeVerticalArrangement;
    spacing?: number;
}
export interface ComposeRowProps extends ComposeNodeProps {
    verticalAlignment?: ComposeVerticalAlignment;
    horizontalArrangement?: ComposeHorizontalArrangement;
    spacing?: number;
}
export interface ComposeBoxProps extends ComposeNodeProps {
    contentAlignment?: ComposeContentAlignment;
}
type ComposeLeafProps = Omit<ComposeNodeProps, 'children'>;
export interface ComposeTextProps extends ComposeLeafProps {
    text: string;
    fontSize?: number;
    fontWeight?: ComposeFontWeight;
    textAlign?: ComposeTextAlign;
    maxLines?: number;
}
export interface ComposeIconProps extends ComposeLeafProps {
    name: ComposeIconName;
    size?: number;
    filled?: boolean;
}
export type ComposeButtonVariant = 'filled' | 'outlined' | 'text';
export type ComposeButtonTone = 'default' | 'danger';
export interface ComposeButtonProps extends ComposeLeafProps {
    label: string;
    disabled?: boolean;
    variant?: ComposeButtonVariant;
    tone?: ComposeButtonTone;
    icon?: ComposeIconName;
    iconFilled?: boolean;
    onPress?: () => void;
}
export interface ComposeSwitchProps extends ComposeLeafProps {
    isOn: boolean;
    disabled?: boolean;
    label?: string;
    onIsOnChange: (value: boolean) => void;
    revision?: number;
}
//# sourceMappingURL=composeTypes.d.ts.map