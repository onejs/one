import type { ScreenOrientationLock, ScreenOrientationValue } from '../specs/OneScreenOrientation.nitro';
export type { ScreenOrientationLock, ScreenOrientationValue, } from '../specs/OneScreenOrientation.nitro';
export declare const ScreenOrientation: Readonly<{
    getOrientation: () => Promise<ScreenOrientationValue>;
    lock: (_orientation: ScreenOrientationLock) => Promise<ScreenOrientationValue>;
    unlock: () => Promise<ScreenOrientationValue>;
    addChangeListener: (onChange: (orientation: ScreenOrientationValue) => void) => (() => void);
}>;
//# sourceMappingURL=unavailable.d.ts.map