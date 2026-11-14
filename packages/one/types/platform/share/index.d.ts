import type { ShareItem, ShareResult } from '../specs/OneShare.nitro.js';
export type { ShareItem, ShareItemType, ShareResult } from '../specs/OneShare.nitro.js';
declare function share(items: ShareItem[]): Promise<ShareResult>;
export declare const Share: Readonly<{
    share: typeof share;
}>;
//# sourceMappingURL=index.d.ts.map