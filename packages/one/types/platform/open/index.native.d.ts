import type { OpenShareContent } from './types';
export type { OpenShareContent } from './types';
declare function openURL(url: string): Promise<void>;
declare function openShare({ title, message, url }: OpenShareContent): Promise<void>;
declare function openSettings(): Promise<void>;
export declare const Open: Readonly<{
    openURL: typeof openURL;
    openShare: typeof openShare;
    openSettings: typeof openSettings;
}>;
//# sourceMappingURL=index.native.d.ts.map