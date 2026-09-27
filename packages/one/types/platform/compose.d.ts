import type { ReactNode } from 'react';
import type { ComposeAlertDialogProps, ComposeAssistChipProps, ComposeBadgeProps, ComposeBadgedBoxProps, ComposeListItemProps, ComposeBoxProps, ComposeButtonProps, ComposeCardProps, ComposeCheckboxProps, ComposeColumnProps, ComposeContainedLoadingIndicatorProps, ComposeDialogProps, ComposeDividerProps, ComposeElevatedCardProps, ComposeExtendedFloatingActionButtonProps, ComposeFilterChipProps, ComposeFlowRowProps, ComposeFloatingActionButtonProps, ComposeIconProps, ComposeIconButtonProps, ComposeInputChipProps, ComposeLoadingIndicatorProps, ComposeOutlinedCardProps, ComposeProgressIndicatorProps, ComposeRadioButtonProps, ComposeRowProps, ComposeSpacerProps, ComposeSegmentedButtonProps, ComposeSegmentedButtonRowProps, ComposeSliderProps, ComposeSuggestionChipProps, ComposeSurfaceProps, ComposeSwitchProps, ComposeTextFieldProps, ComposeTextProps, ComposeToggleButtonProps } from './composeTypes';
declare function Column(_props: ComposeColumnProps): never;
declare function Row(_props: ComposeRowProps): never;
declare function Spacer(_props: ComposeSpacerProps): never;
declare function FlowRow(_props: ComposeFlowRowProps): never;
declare function Box(_props: ComposeBoxProps): never;
declare function Badge(_props: ComposeBadgeProps): never;
declare function BadgedBoxRoot(_props: ComposeBadgedBoxProps): never;
declare function ListItemRoot(_props: ComposeListItemProps): never;
declare function Card(_props: ComposeCardProps): never;
declare function ElevatedCard(_props: ComposeElevatedCardProps): never;
declare function OutlinedCard(_props: ComposeOutlinedCardProps): never;
declare function Surface(_props: ComposeSurfaceProps): never;
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
declare function IconButton(_props: ComposeIconButtonProps): never;
declare function FilledIconButton(_props: ComposeIconButtonProps): never;
declare function FilledTonalIconButton(_props: ComposeIconButtonProps): never;
declare function OutlinedIconButton(_props: ComposeIconButtonProps): never;
declare function ToggleButton(_props: ComposeToggleButtonProps): never;
declare function IconToggleButton(_props: ComposeToggleButtonProps): never;
declare function FilledIconToggleButton(_props: ComposeToggleButtonProps): never;
declare function OutlinedIconToggleButton(_props: ComposeToggleButtonProps): never;
declare function SingleChoiceSegmentedButtonRow(_props: ComposeSegmentedButtonRowProps): never;
declare function MultiChoiceSegmentedButtonRow(_props: ComposeSegmentedButtonRowProps): never;
declare function SegmentedButton(_props: ComposeSegmentedButtonProps): never;
declare function Switch(_props: ComposeSwitchProps): never;
declare function Checkbox(_props: ComposeCheckboxProps): never;
declare function RadioButton(_props: ComposeRadioButtonProps): never;
declare function TextField(_props: ComposeTextFieldProps): never;
declare function Slider(_props: ComposeSliderProps): never;
declare function AlertDialog(_props: ComposeAlertDialogProps): never;
declare function Dialog(_props: ComposeDialogProps): never;
declare function ProgressIndicator(_props: ComposeProgressIndicatorProps): never;
type ProgressVariantProps = Omit<ComposeProgressIndicatorProps, 'variant'>;
declare function LinearProgressIndicator(_props: ProgressVariantProps): never;
declare function CircularProgressIndicator(_props: ProgressVariantProps): never;
declare function LinearWavyProgressIndicator(_props: ProgressVariantProps): never;
declare function CircularWavyProgressIndicator(_props: ProgressVariantProps): never;
declare function LoadingIndicator(_props: ComposeLoadingIndicatorProps): never;
declare function ContainedLoadingIndicator(_props: ComposeContainedLoadingIndicatorProps): never;
export declare const Compose: {
    Column: typeof Column;
    Row: typeof Row;
    Spacer: typeof Spacer;
    FlowRow: typeof FlowRow;
    Box: typeof Box;
    Badge: typeof Badge;
    BadgedBox: typeof BadgedBoxRoot & {
        Badge: (_props: {
            children: ReactNode;
        }) => never;
    };
    ListItem: typeof ListItemRoot & {
        HeadlineContent: (_props: {
            children: ReactNode;
        }) => never;
        OverlineContent: (_props: {
            children: ReactNode;
        }) => never;
        SupportingContent: (_props: {
            children: ReactNode;
        }) => never;
        LeadingContent: (_props: {
            children: ReactNode;
        }) => never;
        TrailingContent: (_props: {
            children: ReactNode;
        }) => never;
    };
    Card: typeof Card;
    ElevatedCard: typeof ElevatedCard;
    OutlinedCard: typeof OutlinedCard;
    Surface: typeof Surface;
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
    FloatingActionButton: ((_props: ComposeFloatingActionButtonProps) => never) & {
        Icon: (_props: {
            children: ReactNode;
        }) => never;
    };
    SmallFloatingActionButton: ((_props: ComposeFloatingActionButtonProps) => never) & {
        Icon: (_props: {
            children: ReactNode;
        }) => never;
    };
    LargeFloatingActionButton: ((_props: ComposeFloatingActionButtonProps) => never) & {
        Icon: (_props: {
            children: ReactNode;
        }) => never;
    };
    ExtendedFloatingActionButton: ((_props: ComposeExtendedFloatingActionButtonProps) => never) & {
        Icon: (_props: {
            children: ReactNode;
        }) => never;
        Text: (_props: {
            children: ReactNode;
        }) => never;
    };
    ToggleButton: typeof ToggleButton;
    IconToggleButton: typeof IconToggleButton;
    FilledIconToggleButton: typeof FilledIconToggleButton;
    OutlinedIconToggleButton: typeof OutlinedIconToggleButton;
    SingleChoiceSegmentedButtonRow: typeof SingleChoiceSegmentedButtonRow;
    MultiChoiceSegmentedButtonRow: typeof MultiChoiceSegmentedButtonRow;
    SegmentedButton: typeof SegmentedButton;
    Switch: typeof Switch;
    Checkbox: typeof Checkbox;
    RadioButton: typeof RadioButton;
    TextField: typeof TextField;
    Slider: typeof Slider;
    AlertDialog: typeof AlertDialog;
    Dialog: typeof Dialog;
    ProgressIndicator: typeof ProgressIndicator;
    LinearProgressIndicator: typeof LinearProgressIndicator;
    CircularProgressIndicator: typeof CircularProgressIndicator;
    LinearWavyProgressIndicator: typeof LinearWavyProgressIndicator;
    CircularWavyProgressIndicator: typeof CircularWavyProgressIndicator;
    LoadingIndicator: typeof LoadingIndicator;
    ContainedLoadingIndicator: typeof ContainedLoadingIndicator;
};
export {};
//# sourceMappingURL=compose.d.ts.map