import { Menu } from './Menu.native';
import { Sheet } from './Sheet.native';
import { Tab, Tabs } from './Tabs.native';
export declare const Swift: {
    Picker({ selection, onSelectionChange, revision, label, disabled, options, pickerStyle, style, ...props }: import("./types").PickerProps): import("react/jsx-runtime").JSX.Element;
    DatePicker({ selection, onSelectionChange, revision, label, disabled, minimumDate, maximumDate, displayedComponents, datePickerStyle, style, ...props }: import("./types").DatePickerProps): import("react/jsx-runtime").JSX.Element;
    ColorPicker({ selection, onSelectionChange, revision, label, disabled, supportsOpacity, style, ...props }: import("./types").ColorPickerProps): import("react/jsx-runtime").JSX.Element;
    Toggle({ isOn, onIsOnChange, revision, label, disabled, toggleStyle, style, ...props }: import("./types").ToggleProps): import("react/jsx-runtime").JSX.Element;
    Slider({ value, onValueChange, revision, label, disabled, minimumValue, maximumValue, step, style, ...props }: import("./types").SliderProps): import("react/jsx-runtime").JSX.Element;
    Stepper({ value, onValueChange, revision, label, disabled, minimumValue, maximumValue, step, style, ...props }: import("./types").StepperProps): import("react/jsx-runtime").JSX.Element;
    Tabs: typeof Tabs;
    Tab: typeof Tab;
    Menu: typeof Menu;
    Sheet: typeof Sheet;
};
export type * from './types';
//# sourceMappingURL=index.native.d.ts.map