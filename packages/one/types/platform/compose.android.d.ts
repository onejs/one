import { type ReactNode } from 'react';
import type { ComposeAlertDialogProps, ComposeAssistChipProps, ComposeBadgeProps, ComposeBadgedBoxProps, ComposeBoxProps, ComposeButtonProps, ComposeCardProps, ComposeCheckboxProps, ComposeColumnProps, ComposeDialogProps, ComposeDividerProps, ComposeElevatedCardProps, ComposeExtendedFloatingActionButtonProps, ComposeFilterChipProps, ComposeFlowRowProps, ComposeFloatingActionButtonProps, ComposeIconProps, ComposeIconButtonProps, ComposeInputChipProps, ComposeListItemProps, ComposeOutlinedCardProps, ComposeProgressIndicatorProps, ComposeRadioButtonProps, ComposeRowProps, ComposeSliderProps, ComposeSuggestionChipProps, ComposeSwitchProps, ComposeTextFieldProps, ComposeTextProps } from './composeTypes';
declare function Column({ children, horizontalAlignment, verticalArrangement, spacing, ...props }: ComposeColumnProps): import("react/jsx-runtime").JSX.Element;
declare function Row({ children, verticalAlignment, horizontalArrangement, spacing, ...props }: ComposeRowProps): import("react/jsx-runtime").JSX.Element;
declare function FlowRow({ children, horizontalArrangement, verticalArrangement, ...props }: ComposeFlowRowProps): import("react/jsx-runtime").JSX.Element;
declare function Box({ children, contentAlignment, ...props }: ComposeBoxProps): import("react/jsx-runtime").JSX.Element;
declare function Badge({ children, containerColor, contentColor, ...props }: ComposeBadgeProps): import("react/jsx-runtime").JSX.Element;
declare function BadgedBoxRoot({ children, ...props }: ComposeBadgedBoxProps): import("react/jsx-runtime").JSX.Element;
declare function ListItemRoot({ children, colors, tonalElevation, shadowElevation, ...props }: ComposeListItemProps): import("react/jsx-runtime").JSX.Element;
declare function Card(props: ComposeCardProps): import("react/jsx-runtime").JSX.Element;
declare function ElevatedCard(props: ComposeElevatedCardProps): import("react/jsx-runtime").JSX.Element;
declare function OutlinedCard(props: ComposeOutlinedCardProps): import("react/jsx-runtime").JSX.Element;
declare function HorizontalDivider({ thickness, color, ...props }: ComposeDividerProps): import("react/jsx-runtime").JSX.Element;
declare function VerticalDivider({ thickness, color, ...props }: ComposeDividerProps): import("react/jsx-runtime").JSX.Element;
declare function AssistChipRoot(props: ComposeAssistChipProps): import("react/jsx-runtime").JSX.Element;
declare function FilterChipRoot(props: ComposeFilterChipProps): import("react/jsx-runtime").JSX.Element;
declare function InputChipRoot(props: ComposeInputChipProps): import("react/jsx-runtime").JSX.Element;
declare function SuggestionChipRoot(props: ComposeSuggestionChipProps): import("react/jsx-runtime").JSX.Element;
declare const ChipLabel: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare const ChipLeadingIcon: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare const ChipTrailingIcon: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare const ChipAvatar: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare const ChipIcon: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare function Text({ text, fontSize, fontWeight, textAlign, maxLines, ...props }: ComposeTextProps): import("react/jsx-runtime").JSX.Element;
export declare function renderIcon({ name, size, filled, ...props }: ComposeIconProps, colorRole?: string): import("react/jsx-runtime").JSX.Element;
declare function Icon(props: ComposeIconProps): import("react/jsx-runtime").JSX.Element;
declare function Button({ label, disabled, variant, tone, icon, iconFilled, onPress, ...props }: ComposeButtonProps): import("react/jsx-runtime").JSX.Element;
declare function IconButton(props: ComposeIconButtonProps): import("react/jsx-runtime").JSX.Element;
declare function FilledIconButton(props: ComposeIconButtonProps): import("react/jsx-runtime").JSX.Element;
declare function FilledTonalIconButton(props: ComposeIconButtonProps): import("react/jsx-runtime").JSX.Element;
declare function OutlinedIconButton(props: ComposeIconButtonProps): import("react/jsx-runtime").JSX.Element;
declare function Switch({ isOn, disabled, label, onIsOnChange, revision, ...props }: ComposeSwitchProps): import("react/jsx-runtime").JSX.Element;
declare function Checkbox({ value, disabled, onCheckedChange, revision, colors, ...props }: ComposeCheckboxProps): import("react/jsx-runtime").JSX.Element;
declare function RadioButton({ selected, disabled, onClick, colors, ...props }: ComposeRadioButtonProps): import("react/jsx-runtime").JSX.Element;
declare function TextField({ text, onTextChange, revision, label, placeholder, disabled, variant, keyboardType, secureText, focused, focusRevision, onFocusChange, imeAction, onSubmit, maxLength, multiline, capitalization, autoCorrect, textAlign, ...props }: ComposeTextFieldProps): import("react/jsx-runtime").JSX.Element;
declare function Slider({ value, onValueChange, revision, minimumValue, maximumValue, step, disabled, ...props }: ComposeSliderProps): import("react/jsx-runtime").JSX.Element;
declare function AlertDialog({ visible, title, message, confirmLabel, dismissLabel, onConfirm, onDismiss, ...props }: ComposeAlertDialogProps): import("react/jsx-runtime").JSX.Element;
declare function Dialog({ children, visible, onDismiss, ...props }: ComposeDialogProps): import("react/jsx-runtime").JSX.Element;
declare function ProgressIndicator({ variant, progress, ...props }: ComposeProgressIndicatorProps): import("react/jsx-runtime").JSX.Element;
export declare const Compose: {
    Column: typeof Column;
    Row: typeof Row;
    FlowRow: typeof FlowRow;
    Box: typeof Box;
    Badge: typeof Badge;
    BadgedBox: typeof BadgedBoxRoot & {
        Badge: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
    };
    ListItem: typeof ListItemRoot & {
        HeadlineContent: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
        OverlineContent: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
        SupportingContent: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
        LeadingContent: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
        TrailingContent: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
    };
    Card: typeof Card;
    ElevatedCard: typeof ElevatedCard;
    OutlinedCard: typeof OutlinedCard;
    HorizontalDivider: typeof HorizontalDivider;
    VerticalDivider: typeof VerticalDivider;
    FilterChip: typeof FilterChipRoot & {
        Label: typeof ChipLabel;
        LeadingIcon: typeof ChipLeadingIcon;
        TrailingIcon: typeof ChipTrailingIcon;
    };
    AssistChip: typeof AssistChipRoot & {
        Label: typeof ChipLabel;
        LeadingIcon: typeof ChipLeadingIcon;
        TrailingIcon: typeof ChipTrailingIcon;
    };
    InputChip: typeof InputChipRoot & {
        Label: typeof ChipLabel;
        Avatar: typeof ChipAvatar;
        TrailingIcon: typeof ChipTrailingIcon;
    };
    SuggestionChip: typeof SuggestionChipRoot & {
        Label: typeof ChipLabel;
        Icon: typeof ChipIcon;
    };
    Text: typeof Text;
    Icon: typeof Icon;
    Button: typeof Button;
    IconButton: typeof IconButton;
    FilledIconButton: typeof FilledIconButton;
    FilledTonalIconButton: typeof FilledTonalIconButton;
    OutlinedIconButton: typeof OutlinedIconButton;
    FloatingActionButton: ((props: ComposeFloatingActionButtonProps) => import("react/jsx-runtime").JSX.Element) & {
        Icon: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
    };
    SmallFloatingActionButton: ((props: ComposeFloatingActionButtonProps) => import("react/jsx-runtime").JSX.Element) & {
        Icon: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
    };
    LargeFloatingActionButton: ((props: ComposeFloatingActionButtonProps) => import("react/jsx-runtime").JSX.Element) & {
        Icon: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
    };
    ExtendedFloatingActionButton: ((props: ComposeExtendedFloatingActionButtonProps) => import("react/jsx-runtime").JSX.Element) & {
        Icon: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
        Text: ({ children }: {
            children: ReactNode;
        }) => import("react/jsx-runtime").JSX.Element;
    };
    Switch: typeof Switch;
    Checkbox: typeof Checkbox;
    RadioButton: typeof RadioButton;
    TextField: typeof TextField;
    Slider: typeof Slider;
    AlertDialog: typeof AlertDialog;
    Dialog: typeof Dialog;
    ProgressIndicator: typeof ProgressIndicator;
};
export {};
//# sourceMappingURL=compose.android.d.ts.map