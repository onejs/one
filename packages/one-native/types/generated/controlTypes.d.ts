import type { ViewProps } from 'react-native';
import type * as Styles from './swiftui';
export type PickerOption = Readonly<{
    value: string;
    label: string;
}>;
export type DialogAction = Readonly<{
    id: string;
    label: string;
    role?: Styles.ButtonRole;
}>;
export interface PickerProps extends Omit<ViewProps, 'children'> {
    selection: string;
    onSelectionChange: (value: string) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    options: readonly PickerOption[];
    pickerStyle?: Styles.PickerStyle;
}
export interface DatePickerProps extends Omit<ViewProps, 'children'> {
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
export interface ColorPickerProps extends Omit<ViewProps, 'children'> {
    selection: string;
    onSelectionChange: (value: string) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    supportsOpacity?: boolean;
}
export interface ToggleProps extends Omit<ViewProps, 'children'> {
    isOn: boolean;
    onIsOnChange: (value: boolean) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    toggleStyle?: Styles.ToggleStyle;
}
export interface SliderProps extends Omit<ViewProps, 'children'> {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
}
export interface StepperProps extends Omit<ViewProps, 'children'> {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
}
export interface ButtonProps extends Omit<ViewProps, 'children'> {
    onPress?: () => void;
    label?: string;
    disabled?: boolean;
    systemImage?: string;
    buttonRole?: Styles.ButtonRole | '';
    buttonStyle?: Styles.PrimitiveButtonStyle;
}
export interface ProgressViewProps extends Omit<ViewProps, 'children'> {
    label?: string;
    disabled?: boolean;
    value?: number;
    total?: number;
    progressViewStyle?: Styles.ProgressViewStyle;
}
export interface GaugeProps extends Omit<ViewProps, 'children'> {
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
export interface TextFieldProps extends Omit<ViewProps, 'children'> {
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
export interface SecureFieldProps extends Omit<ViewProps, 'children'> {
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
export interface AlertProps extends Omit<ViewProps, 'children'> {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onAction?: (id: string) => void;
    title?: string;
    message?: string;
    actions: readonly DialogAction[];
}
export interface ConfirmationDialogProps extends Omit<ViewProps, 'children'> {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onAction?: (id: string) => void;
    title?: string;
    message?: string;
    actions: readonly DialogAction[];
    titleVisibility?: Styles.Visibility;
}
//# sourceMappingURL=controlTypes.d.ts.map