import type { AppIconEntry } from './types';
export type { AppIconEntry };
declare function isSupported(): Promise<boolean>;
declare function getCurrentName(): Promise<string | undefined>;
declare function setIcon(name?: string): Promise<void>;
declare function list(): AppIconEntry[];
export declare const AppIcon: Readonly<{
    isSupported: typeof isSupported;
    getCurrentName: typeof getCurrentName;
    setIcon: typeof setIcon;
    list: typeof list;
}>;
//# sourceMappingURL=index.native.d.ts.map