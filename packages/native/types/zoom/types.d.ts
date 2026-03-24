import type { PropsWithChildren } from 'react';
export interface SourceAlignmentRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface DismissalBoundsRect {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
}
export interface ZoomTransitionSourceProps extends PropsWithChildren {
    identifier: string;
    alignment?: SourceAlignmentRect;
    animateAspectRatioChange?: boolean;
}
export interface ZoomTransitionEnablerProps {
    zoomTransitionSourceIdentifier: string;
    dismissalBoundsRect?: DismissalBoundsRect | null;
}
export interface ZoomTransitionAlignmentRectDetectorProps extends PropsWithChildren {
    identifier: string;
}
//# sourceMappingURL=types.d.ts.map