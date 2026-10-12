import type { ScreenOrientationLock, ScreenOrientationValue } from '../specs/OneScreenOrientation.nitro';
export type { ScreenOrientationLock, ScreenOrientationValue };
export declare const ScreenOrientation: Readonly<{
    getOrientation: () => Promise<ScreenOrientationValue>;
    lock: (value: ScreenOrientationLock) => Promise<ScreenOrientationValue>;
    unlock: () => Promise<ScreenOrientationValue>;
    addChangeListener: (onChange: (value: ScreenOrientationValue) => void) => (() => void);
}>;
//# sourceMappingURL=index.d.ts.map