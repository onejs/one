import type { ComposeBoxProps, ComposeButtonProps, ComposeColumnProps, ComposeIconProps, ComposeRowProps, ComposeSwitchProps, ComposeTextProps } from './composeTypes';
declare function Column({ children, horizontalAlignment, verticalArrangement, spacing, ...props }: ComposeColumnProps): import("react/jsx-runtime").JSX.Element;
declare function Row({ children, verticalAlignment, horizontalArrangement, spacing, ...props }: ComposeRowProps): import("react/jsx-runtime").JSX.Element;
declare function Box({ children, contentAlignment, ...props }: ComposeBoxProps): import("react/jsx-runtime").JSX.Element;
declare function Text({ text, fontSize, fontWeight, textAlign, maxLines, ...props }: ComposeTextProps): import("react/jsx-runtime").JSX.Element;
declare function Icon({ name, size, filled, ...props }: ComposeIconProps): import("react/jsx-runtime").JSX.Element;
declare function Button({ label, disabled, variant, tone, icon, iconFilled, onPress, ...props }: ComposeButtonProps): import("react/jsx-runtime").JSX.Element;
declare function Switch({ isOn, disabled, label, onIsOnChange, revision, ...props }: ComposeSwitchProps): import("react/jsx-runtime").JSX.Element;
export declare const Compose: {
    Column: typeof Column;
    Row: typeof Row;
    Box: typeof Box;
    Text: typeof Text;
    Icon: typeof Icon;
    Button: typeof Button;
    Switch: typeof Switch;
};
export {};
//# sourceMappingURL=compose.android.d.ts.map