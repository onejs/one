import type { ShareItem, ShareResult } from '../specs/OneShare.nitro';
declare function share(items: ShareItem[]): Promise<ShareResult>;
export declare function shareNative(): {
    share: typeof share;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map