import type * as Types from './controlTypes';
export declare function Picker({ selection, onSelectionChange, revision, label, disabled, options, pickerStyle, style, ...props }: Types.PickerProps): import("react/jsx-runtime").JSX.Element;
export declare function DatePicker({ selection, onSelectionChange, revision, label, disabled, minimumDate, maximumDate, displayedComponents, datePickerStyle, style, ...props }: Types.DatePickerProps): import("react/jsx-runtime").JSX.Element;
export declare function ColorPicker({ selection, onSelectionChange, revision, label, disabled, supportsOpacity, style, ...props }: Types.ColorPickerProps): import("react/jsx-runtime").JSX.Element;
export declare function Toggle({ isOn, onIsOnChange, revision, label, disabled, toggleStyle, style, ...props }: Types.ToggleProps): import("react/jsx-runtime").JSX.Element;
export declare function Slider({ value, onValueChange, revision, label, disabled, minimumValue, maximumValue, step, style, ...props }: Types.SliderProps): import("react/jsx-runtime").JSX.Element;
export declare function Stepper({ value, onValueChange, revision, label, disabled, minimumValue, maximumValue, step, style, ...props }: Types.StepperProps): import("react/jsx-runtime").JSX.Element;
export declare function Text({ text, style, ...props }: Types.TextProps): import("react/jsx-runtime").JSX.Element;
export declare function Label({ label, disabled, systemImage, style, ...props }: Types.LabelProps): import("react/jsx-runtime").JSX.Element;
export declare function Button({ onPress, label, disabled, systemImage, buttonRole, buttonStyle, style, ...props }: Types.ButtonProps): import("react/jsx-runtime").JSX.Element;
export declare function ProgressView({ label, disabled, value, total, progressViewStyle, style, ...props }: Types.ProgressViewProps): import("react/jsx-runtime").JSX.Element;
export declare function Gauge({ label, disabled, value, minimumValue, maximumValue, currentValueLabel, minimumValueLabel, maximumValueLabel, gaugeStyle, style, ...props }: Types.GaugeProps): import("react/jsx-runtime").JSX.Element;
export declare function TextField({ text, onTextChange, revision, onSubmit, label, disabled, prompt, textFieldStyle, submitLabel, textInputAutocapitalization, autocorrectionDisabled, axis, style, ...props }: Types.TextFieldProps): import("react/jsx-runtime").JSX.Element;
export declare function SecureField({ text, onTextChange, revision, onSubmit, label, disabled, prompt, textFieldStyle, submitLabel, textInputAutocapitalization, autocorrectionDisabled, style, ...props }: Types.SecureFieldProps): import("react/jsx-runtime").JSX.Element;
export declare function Alert({ isPresented, onIsPresentedChange, revision, onAction, title, message, actions, style, ...props }: Types.AlertProps): import("react/jsx-runtime").JSX.Element;
export declare function ConfirmationDialog({ isPresented, onIsPresentedChange, revision, onAction, title, message, actions, titleVisibility, style, ...props }: Types.ConfirmationDialogProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Controls.native.d.ts.map