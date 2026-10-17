import type { AppIconEntry } from './types';
export type { AppIconEntry };
export declare const AppIcon: Readonly<{
    isSupported: () => Promise<boolean>;
    getCurrentName: () => Promise<string | undefined>;
    setIcon: (_name?: string) => Promise<void>;
    list: () => AppIconEntry[];
}>;
//# sourceMappingURL=unavailable.d.ts.map