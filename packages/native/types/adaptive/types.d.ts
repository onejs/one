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
export interface ReservedRegion {
    id: string;
    kind: ReservedRegionKind;
    frame: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    margins: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
    isActive: boolean;
}
export interface ReservedRegionOptions {
    includeInactive?: boolean;
}
//# sourceMappingURL=types.d.ts.map