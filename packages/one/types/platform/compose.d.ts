import type { ReactNode } from 'react';
import type { ComposeAlertDialogProps, ComposeAssistChipProps, ComposeBadgeProps, ComposeBadgedBoxProps, ComposeBoxProps, ComposeButtonProps, ComposeCardProps, ComposeCheckboxProps, ComposeColumnProps, ComposeDialogProps, ComposeDividerProps, ComposeElevatedCardProps, ComposeFilterChipProps, ComposeIconProps, ComposeInputChipProps, ComposeOutlinedCardProps, ComposeProgressIndicatorProps, ComposeRadioButtonProps, ComposeRowProps, ComposeSliderProps, ComposeSuggestionChipProps, ComposeSwitchProps, ComposeTextFieldProps, ComposeTextProps } from './composeTypes';
declare function Column(_props: ComposeColumnProps): never;
declare function Row(_props: ComposeRowProps): never;
declare function Box(_props: ComposeBoxProps): never;
declare function Badge(_props: ComposeBadgeProps): never;
declare function BadgedBoxRoot(_props: ComposeBadgedBoxProps): never;
declare function Card(_props: ComposeCardProps): never;
declare function ElevatedCard(_props: ComposeElevatedCardProps): never;
declare function OutlinedCard(_props: ComposeOutlinedCardProps): never;
declare function HorizontalDivider(_props: ComposeDividerProps): never;
declare function VerticalDivider(_props: ComposeDividerProps): never;
declare function FilterChipRoot(_props: ComposeFilterChipProps): never;
declare function AssistChipRoot(_props: ComposeAssistChipProps): never;
declare function InputChipRoot(_props: ComposeInputChipProps): never;
declare function SuggestionChipRoot(_props: ComposeSuggestionChipProps): never;
declare const ChipLabel: (_props: {
    children: ReactNode;
}) => never;
declare const ChipLeadingIcon: (_props: {
    children: ReactNode;
}) => never;
declare const ChipTrailingIcon: (_props: {
    children: ReactNode;
}) => never;
declare const ChipAvatar: (_props: {
    children: ReactNode;
}) => never;
declare const ChipIcon: (_props: {
    children: ReactNode;
}) => never;
declare function Text(_props: ComposeTextProps): never;
declare function Icon(_props: ComposeIconProps): never;
declare function Button(_props: ComposeButtonProps): never;
declare function Switch(_props: ComposeSwitchProps): never;
declare function Checkbox(_props: ComposeCheckboxProps): never;
declare function RadioButton(_props: ComposeRadioButtonProps): never;
declare function TextField(_props: ComposeTextFieldProps): never;
declare function Slider(_props: ComposeSliderProps): never;
declare function AlertDialog(_props: ComposeAlertDialogProps): never;
declare function Dialog(_props: ComposeDialogProps): never;
declare function ProgressIndicator(_props: ComposeProgressIndicatorProps): never;
export declare const Compose: {
    Column: typeof Column;
    Row: typeof Row;
    Box: typeof Box;
    Badge: typeof Badge;
    BadgedBox: typeof BadgedBoxRoot & {
        Badge: (_props: {
            children: ReactNode;
        }) => never;
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
//# sourceMappingURL=compose.d.ts.map