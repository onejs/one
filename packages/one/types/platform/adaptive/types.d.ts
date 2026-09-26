import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
export type UserInterfaceSizeClass = 'compact' | 'regular' | 'unspecified';
export interface SizeClass {
    horizontal: UserInterfaceSizeClass;
    vertical: UserInterfaceSizeClass;
}
export type HingeStatus = 'unknown' | 'closed' | 'partiallyOpen' | 'fullyOpen';
export interface HingeState {
    status: HingeStatus;
    /** Angle of the hinge in radians. */
    angle: number;
}
export type ReservedRegionKind = 'division' | 'occlusion';
/** A region reserved inside a ReservedRegions.Provider, in its coordinates. */
export interface ReservedRegion {
    id: string;
    kind: ReservedRegionKind;
    /** The reserved rect including margins, in the provider's coordinates. */
    frame: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Room kept around the reserved rect for interactive content. */
    margins: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
    isActive: boolean;
}
/** an unobstructed part of a ReservedRegions.Provider, in its coordinates. This is a window segment when the provider fills the window. */
export interface WindowSegment {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface ReservedRegionOptions {
    kind?: ReservedRegionKind;
    includeInactive?: boolean;
}
export interface ReservedRegionsProviderProps extends ViewProps {
    children?: ReactNode;
}
//# sourceMappingURL=types.d.ts.map
