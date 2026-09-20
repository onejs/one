import type { ComposeAlertDialogProps, ComposeBoxProps, ComposeButtonProps, ComposeColumnProps, ComposeDialogProps, ComposeIconProps, ComposeProgressIndicatorProps, ComposeRowProps, ComposeSliderProps, ComposeSwitchProps, ComposeTextFieldProps, ComposeTextProps } from './composeTypes';
declare function Column({ children, horizontalAlignment, verticalArrangement, spacing, ...props }: ComposeColumnProps): import("react/jsx-runtime").JSX.Element;
declare function Row({ children, verticalAlignment, horizontalArrangement, spacing, ...props }: ComposeRowProps): import("react/jsx-runtime").JSX.Element;
declare function Box({ children, contentAlignment, ...props }: ComposeBoxProps): import("react/jsx-runtime").JSX.Element;
declare function Text({ text, fontSize, fontWeight, textAlign, maxLines, ...props }: ComposeTextProps): import("react/jsx-runtime").JSX.Element;
declare function Icon({ name, size, filled, ...props }: ComposeIconProps): import("react/jsx-runtime").JSX.Element;
declare function Button({ label, disabled, variant, tone, icon, iconFilled, onPress, ...props }: ComposeButtonProps): import("react/jsx-runtime").JSX.Element;
declare function Switch({ isOn, disabled, label, onIsOnChange, revision, ...props }: ComposeSwitchProps): import("react/jsx-runtime").JSX.Element;
declare function TextField({ text, onTextChange, revision, label, placeholder, disabled, variant, keyboardType, secureText, focused, focusRevision, onFocusChange, imeAction, onSubmit, maxLength, multiline, capitalization, autoCorrect, textAlign, ...props }: ComposeTextFieldProps): import("react/jsx-runtime").JSX.Element;
declare function Slider({ value, onValueChange, revision, minimumValue, maximumValue, step, disabled, ...props }: ComposeSliderProps): import("react/jsx-runtime").JSX.Element;
declare function AlertDialog({ visible, title, message, confirmLabel, dismissLabel, onConfirm, onDismiss, ...props }: ComposeAlertDialogProps): import("react/jsx-runtime").JSX.Element;
declare function Dialog({ children, visible, onDismiss, ...props }: ComposeDialogProps): import("react/jsx-runtime").JSX.Element;
declare function ProgressIndicator({ variant, progress, ...props }: ComposeProgressIndicatorProps): import("react/jsx-runtime").JSX.Element;
export declare const Compose: {
    Column: typeof Column;
    Row: typeof Row;
    Box: typeof Box;
    Text: typeof Text;
    Icon: typeof Icon;
    Button: typeof Button;
    Switch: typeof Switch;
    TextField: typeof TextField;
    Slider: typeof Slider;
    AlertDialog: typeof AlertDialog;
    Dialog: typeof Dialog;
    ProgressIndicator: typeof ProgressIndicator;
};
export {};
//# sourceMappingURL=compose.android.d.ts.map