export type * from './generated/types';
export type * from './generated/controlTypes';
export type * from './generated/sheetTypes';
export type * from './generated/popoverTypes';
export type * from './generated/containerTypes';
export type * from './listTypes';
export type * from './groupTypes';
export type * from './textTypes';
import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { OneNativeStyle, SDKLabelStyle } from './generated/controlTypes';
import type { AdaptableTabBarPlacement, SpringLoadingBehavior, TabCustomizationBehavior, TabPlacement, TabRole, TabSectionExpansion, TabViewStyle, Visibility } from './generated/swiftui';
import type { TabViewSlotName } from './generated/viewSlots';
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
    id: string;
    title: string;
    systemImage?: string;
    image?: string;
    labelStyle?: SDKLabelStyle;
    badge?: string | number;
    role?: TabRole;
    tabPlacement?: TabPlacement;
    testID?: string;
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
        systemImage?: string;
        onPress: () => void;
    }[];
    children: ReactNode;
}
export interface TabsProps extends ViewProps {
    selection: string;
    onSelectionChange: (id: string) => void;
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
//# sourceMappingURL=types.d.ts.map