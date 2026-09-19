import { type OnePlatformName } from './native/platform';
export type OneEnvironment = {
    platform: OnePlatformName;
};
export declare const One: {
    readonly platform: OnePlatformName;
    readonly iOS: unknown;
    readonly Android: unknown;
    UI: {};
    selectAdapter(name: OnePlatformName): import("./native").OneNativePlatform;
};
//# sourceMappingURL=one.d.ts.map