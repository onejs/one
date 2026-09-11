import { Menu } from './Menu.native';
import { Sheet } from './Sheet.native';
import { Tab, Tabs } from './Tabs.native';
export declare const Swift: {
    Tabs: (_props: import("./types").TabsProps) => never;
    Tab: (_props: import("./types").TabProps) => never;
    Menu: (_props: import("./types").MenuProps) => never;
    Sheet: (_props: import("./types").SheetProps) => never;
    Picker: (_props: import("./types").PickerProps) => never;
    DatePicker: (_props: import("./types").DatePickerProps) => never;
    ColorPicker: (_props: import("./types").ColorPickerProps) => never;
    Toggle: (_props: import("./types").ToggleProps) => never;
    Slider: (_props: import("./types").SliderProps) => never;
    Stepper: (_props: import("./types").StepperProps) => never;
} | {
    Picker({ selection, onSelectionChange, revision, label, disabled, options, pickerStyle, style, ...props }: import("./types").PickerProps): import("react/jsx-runtime").JSX.Element;
    DatePicker({ selection, onSelectionChange, revision, label, disabled, minimumDate, maximumDate, displayedComponents, datePickerStyle, style, ...props }: import("./types").DatePickerProps): import("react/jsx-runtime").JSX.Element;
    ColorPicker({ selection, onSelectionChange, revision, label, disabled, supportsOpacity, style, ...props }: import("./types").ColorPickerProps): import("react/jsx-runtime").JSX.Element;
    Toggle({ isOn, onIsOnChange, revision, label, disabled, toggleStyle, style, ...props }: import("./types").ToggleProps): import("react/jsx-runtime").JSX.Element;
    Slider({ value, onValueChange, revision, label, disabled, minimumValue, maximumValue, step, style, ...props }: import("./types").SliderProps): import("react/jsx-runtime").JSX.Element;
    Stepper({ value, onValueChange, revision, label, disabled, minimumValue, maximumValue, step, style, ...props }: import("./types").StepperProps): import("react/jsx-runtime").JSX.Element;
    Button({ onPress, label, disabled, systemImage, buttonRole, buttonStyle, style, ...props }: import("./types").ButtonProps): import("react/jsx-runtime").JSX.Element;
    ProgressView({ label, disabled, value, total, progressViewStyle, style, ...props }: import("./types").ProgressViewProps): import("react/jsx-runtime").JSX.Element;
    Gauge({ label, disabled, value, minimumValue, maximumValue, currentValueLabel, minimumValueLabel, maximumValueLabel, gaugeStyle, style, ...props }: import("./types").GaugeProps): import("react/jsx-runtime").JSX.Element;
    TextField({ text, onTextChange, revision, onSubmit, label, disabled, prompt, textFieldStyle, submitLabel, textInputAutocapitalization, autocorrectionDisabled, axis, style, ...props }: import("./types").TextFieldProps): import("react/jsx-runtime").JSX.Element;
    SecureField({ text, onTextChange, revision, onSubmit, label, disabled, prompt, textFieldStyle, submitLabel, textInputAutocapitalization, autocorrectionDisabled, style, ...props }: import("./types").SecureFieldProps): import("react/jsx-runtime").JSX.Element;
    Tabs: typeof Tabs;
    Tab: typeof Tab;
    Menu: typeof Menu;
    Sheet: typeof Sheet;
};
export type * from './types';
//# sourceMappingURL=index.native.d.ts.map