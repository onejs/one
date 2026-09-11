import type { ViewProps } from 'react-native';
import type * as Styles from './swiftui';
export type OneNativeViewProps = Pick<ViewProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityValue' | 'testID' | 'style' | 'onLayout'>;
export type PickerOption = Readonly<{
    value: string;
    label: string;
}>;
export type MapMarker = Readonly<{
    id: string;
    label: string;
    latitude: number;
    longitude: number;
}>;
export type DialogAction = Readonly<{
    id: string;
    label: string;
    role?: Styles.ButtonRole;
}>;
export interface PickerProps extends OneNativeViewProps {
    selection: string;
    onSelectionChange: (value: string) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    options: readonly PickerOption[];
    pickerStyle?: Styles.PickerStyle;
}
export interface DatePickerProps extends OneNativeViewProps {
    selection: Date;
    onSelectionChange: (value: Date) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumDate?: Date;
    maximumDate?: Date;
    displayedComponents?: 'date' | 'hourAndMinute' | 'dateAndTime';
    datePickerStyle?: Styles.DatePickerStyle;
}
export interface ColorPickerProps extends OneNativeViewProps {
    selection: string;
    onSelectionChange: (value: string) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    supportsOpacity?: boolean;
}
export interface ToggleProps extends OneNativeViewProps {
    isOn: boolean;
    onIsOnChange: (value: boolean) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    toggleStyle?: Styles.ToggleStyle;
}
export interface SliderProps extends OneNativeViewProps {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
}
export interface StepperProps extends OneNativeViewProps {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
}
export interface TextProps extends OneNativeViewProps {
    text?: string;
}
export interface LabelProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    systemImage?: string;
}
export interface ButtonProps extends OneNativeViewProps {
    onPress?: () => void;
    label?: string;
    disabled?: boolean;
    systemImage?: string;
    buttonRole?: Styles.ButtonRole | '';
    buttonStyle?: Styles.PrimitiveButtonStyle;
}
export interface ProgressViewProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    value?: number;
    total?: number;
    progressViewStyle?: Styles.ProgressViewStyle;
}
export interface GaugeProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    value?: number;
    minimumValue?: number;
    maximumValue?: number;
    currentValueLabel?: string;
    minimumValueLabel?: string;
    maximumValueLabel?: string;
    gaugeStyle?: Styles.GaugeStyle;
}
export interface VideoPlayerProps extends OneNativeViewProps {
    url?: string;
    autoplay?: boolean;
}
export interface MapProps extends OneNativeViewProps {
    onRegionChange?: (latitude: number, longitude: number, distance: number) => void;
    latitude?: number;
    longitude?: number;
    distance?: number;
    markers: readonly MapMarker[];
}
export interface TextFieldProps extends OneNativeViewProps {
    text: string;
    onTextChange: (value: string) => void;
    revision?: number;
    onSubmit?: () => void;
    label?: string;
    disabled?: boolean;
    prompt?: string;
    textFieldStyle?: Styles.TextFieldStyle;
    submitLabel?: Styles.SubmitLabel | '';
    textInputAutocapitalization?: Styles.TextInputAutocapitalization | '';
    autocorrectionDisabled?: boolean;
    axis?: Styles.Axis;
}
export interface SecureFieldProps extends OneNativeViewProps {
    text: string;
    onTextChange: (value: string) => void;
    revision?: number;
    onSubmit?: () => void;
    label?: string;
    disabled?: boolean;
    prompt?: string;
    textFieldStyle?: Styles.TextFieldStyle;
    submitLabel?: Styles.SubmitLabel | '';
    textInputAutocapitalization?: Styles.TextInputAutocapitalization | '';
    autocorrectionDisabled?: boolean;
}
export interface AlertProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onAction?: (id: string) => void;
    title?: string;
    message?: string;
    actions: readonly DialogAction[];
}
export interface ConfirmationDialogProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onAction?: (id: string) => void;
    title?: string;
    message?: string;
    actions: readonly DialogAction[];
    titleVisibility?: Styles.Visibility;
}
export interface QuickLookProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    url?: string;
}
//# sourceMappingURL=controlTypes.d.ts.map