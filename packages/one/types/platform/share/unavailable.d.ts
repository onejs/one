import type { ShareItem, ShareResult } from '../specs/OneShare.nitro'
export type { ShareItem, ShareItemType, ShareResult } from '../specs/OneShare.nitro'
declare function share(_items: ShareItem[]): Promise<ShareResult>
export declare const Share: Readonly<{
  share: typeof share
}>
//# sourceMappingURL=unavailable.d.ts.map
