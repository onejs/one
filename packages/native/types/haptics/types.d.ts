export type HapticImpact = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';
export type HapticNotification = 'success' | 'warning' | 'error';
export interface Haptics {
    /** picking among options, toggles, segments, mode switches */
    selection(): void;
    /** physical commits, drops, hard snaps, drag thresholds */
    impact(style: HapticImpact): void;
    /** completion and failure the user cares about */
    notification(type: HapticNotification): void;
}
//# sourceMappingURL=types.d.ts.map