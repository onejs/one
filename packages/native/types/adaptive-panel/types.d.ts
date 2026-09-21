import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
export type AdaptivePanelDetent = 'medium' | 'large' | {
    fraction: number;
} | {
    height: number;
};
export type AdaptivePanelPlacement = 'hidden' | 'compact' | 'regular';
export interface AdaptivePanelFrame {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface AdaptivePanelProps extends ViewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    revision?: number;
    compactDetents?: readonly AdaptivePanelDetent[];
    selectedDetent?: AdaptivePanelDetent;
    onSelectedDetentChange?: (detent: AdaptivePanelDetent) => void;
    detentRevision?: number;
    regularWidth?: number;
    onPlacementChange?: (placement: AdaptivePanelPlacement) => void;
    onFrameChange?: (frame: AdaptivePanelFrame) => void;
    children: ReactNode;
}
//# sourceMappingURL=types.d.ts.map