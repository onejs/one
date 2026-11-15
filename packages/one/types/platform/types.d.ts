export type { SFSymbolName } from './generated/sfSymbolNames.js';
export type * from './generated/types.js';
export type * from './generated/controlTypes.js';
export type * from './generated/sheetTypes.js';
export type * from './generated/popoverTypes.js';
export type * from './generated/containerTypes.js';
export type * from './listTypes.js';
export type { CanvasColorMode, CanvasPoint, CanvasProps, CanvasRect, CanvasSize, CanvasSymbol, CanvasText, FillStyle, GraphicsContext, RoundedCornerStyle, StrokeStyle, } from './canvas.js';
export type * from './gridTypes.js';
export type * from './groupTypes.js';
export type { MapControlsSlot, MapWithControlsProps } from './mapControls.js';
import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { OneNativeStyle, SDKLabelStyle } from './generated/controlTypes.js';
import type { AdaptableTabBarPlacement, SpringLoadingBehavior, TabCustomizationBehavior, TabPlacement, TabRole, TabSectionExpansion, TabViewStyle, Visibility } from './generated/swiftui.js';
import type { SFSymbolName } from './generated/sfSymbolNames.js';
import type { TabViewSlotName } from './generated/viewSlots.js';
export interface TabContentProps {
    disabled?: boolean;
    hidden?: boolean;
    customizationID?: string;
    customizationBehavior?: {
        behavior: TabCustomizationBehavior;
        for?: readonly AdaptableTabBarPlacement[];
    };
    defaultVisibility?: {
        visibility: Visibility;
        for?: readonly AdaptableTabBarPlacement[];
    };
    springLoadingBehavior?: SpringLoadingBehavior;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityValue?: string;
    accessibilityIdentifier?: string;
    help?: string;
}
export interface TabProps extends TabContentProps {
    value: string;
    titleKey: string;
    systemImage?: SFSymbolName | '';
    image?: string;
    labelStyle?: SDKLabelStyle;
    badge?: string | number;
    role?: TabRole;
    tabPlacement?: TabPlacement;
    testID?: string;
    navigationStack?: boolean;
    onPress?: () => void;
    swiftStyle?: OneNativeStyle;
    children?: ReactNode;
}
export interface TabSectionProps extends TabContentProps {
    id: string;
    title: string;
    defaultSectionExpansion?: TabSectionExpansion;
    sectionActions?: readonly {
        id: string;
        title: string;
        systemImage?: SFSymbolName | '';
        onPress: () => void;
    }[];
    children: ReactNode;
}
export interface TabViewProps extends ViewProps {
    selection: string;
    onSelectionChange: (value: string) => void;
    onReselect?: (value: string) => void;
    revision?: number;
    tabViewStyle?: TabViewStyle;
    tabBarVisibility?: Visibility;
    customization?: string;
    onCustomizationChange?: (customization: string) => void;
    swiftStyle?: OneNativeStyle;
    children: ReactNode;
}
export interface TabViewSlotProps {
    name: TabViewSlotName;
    height: number;
    children: ReactNode;
}
export interface TabViewBottomAccessoryProps {
    isEnabled?: boolean;
    children?: ReactNode;
    inline?: ReactNode;
    expanded?: ReactNode;
}
export type WithAnimationCompletionCriteria = 'logicallyComplete' | 'removed';
//# sourceMappingURL=types.d.ts.map