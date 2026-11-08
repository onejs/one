import type { ShareTargetDraft } from './types';
export type { ShareTargetDraft, ShareTargetItem, ShareTargetSharedFile } from './types';
export declare const ShareTarget: Readonly<{
    getDrafts(_appGroup: string): Promise<ShareTargetDraft[]>;
    discardDraft(_appGroup: string, _submissionId: string): Promise<void>;
}>;
//# sourceMappingURL=unavailable.d.ts.map