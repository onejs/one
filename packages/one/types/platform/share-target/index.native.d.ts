import type { ShareTargetDraft } from './types';
export type { ShareTargetDraft, ShareTargetItem, ShareTargetSharedFile } from './types';
export declare const ShareTarget: Readonly<{
    getDrafts(appGroup: string): Promise<ShareTargetDraft[]>;
    discardDraft(appGroup: string, submissionId: string): Promise<void>;
}>;
//# sourceMappingURL=index.native.d.ts.map