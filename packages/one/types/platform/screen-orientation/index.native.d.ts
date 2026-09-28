import type { ScreenOrientationLock, ScreenOrientationValue } from '../specs/OneScreenOrientation.nitro';
export type { ScreenOrientationLock, ScreenOrientationValue } from '../specs/OneScreenOrientation.nitro';
declare function getOrientation(): Promise<ScreenOrientationValue>;
declare function lock(orientation: ScreenOrientationLock): Promise<ScreenOrientationValue>;
declare function unlock(): Promise<ScreenOrientationValue>;
declare function addChangeListener(onChange: (orientation: ScreenOrientationValue) => void): () => void;
export declare const ScreenOrientation: Readonly<{
    getOrientation: typeof getOrientation;
    lock: typeof lock;
    unlock: typeof unlock;
    addChangeListener: typeof addChangeListener;
}>;
//# sourceMappingURL=index.native.d.ts.map