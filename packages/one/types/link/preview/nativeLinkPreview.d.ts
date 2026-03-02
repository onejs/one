/**
 * React Native implementation using native views (iOS only).
 * Web and Android fall back to passthrough/null behavior.
 */
import type { PropsWithChildren } from 'react';
import { type ViewProps, type ColorValue } from 'react-native';
export interface NativeLinkPreviewActionProps {
    identifier: string;
    title: string;
    icon?: string;
    children?: React.ReactNode;
    disabled?: boolean;
    destructive?: boolean;
    discoverabilityLabel?: string;
    subtitle?: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    displayAsPalette?: boolean;
    displayInline?: boolean;
    preferredElementSize?: 'auto' | 'small' | 'medium' | 'large';
    isOn?: boolean;
    keepPresented?: boolean;
    hidden?: boolean;
    tintColor?: ColorValue;
    barButtonItemStyle?: 'plain' | 'prominent';
    sharesBackground?: boolean;
    hidesSharedBackground?: boolean;
    onSelected: () => void;
}
export declare function NativeLinkPreviewAction(props: NativeLinkPreviewActionProps): import("react/jsx-runtime").JSX.Element | null;
export interface TabPath {
    oldTabKey: string;
    newTabKey: string;
}
export interface NativeLinkPreviewProps extends ViewProps {
    nextScreenId: string | undefined;
    tabPath: {
        path: TabPath[];
    } | undefined;
    disableForceFlatten?: boolean;
    onWillPreviewOpen?: () => void;
    onDidPreviewOpen?: () => void;
    onPreviewWillClose?: () => void;
    onPreviewDidClose?: () => void;
    onPreviewTapped?: () => void;
    onPreviewTappedAnimationCompleted?: () => void;
    children: React.ReactNode;
}
export declare function NativeLinkPreview(props: NativeLinkPreviewProps): import("react/jsx-runtime").JSX.Element;
export interface NativeLinkPreviewContentProps extends ViewProps {
    preferredContentSize?: {
        width: number;
        height: number;
    };
}
export declare function NativeLinkPreviewContent(props: PropsWithChildren<NativeLinkPreviewContentProps>): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=nativeLinkPreview.d.ts.map