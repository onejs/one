export interface ShareTargetSharedFile {
    url: string;
    name: string;
    mimeType: string;
    byteCount: number;
}
export type ShareTargetItem = {
    kind: 'text';
    text: string;
} | {
    kind: 'url';
    url: string;
} | {
    kind: 'file';
    file: ShareTargetSharedFile;
};
export interface ShareTargetDraft {
    id: string;
    destinationId: string | null;
    text: string;
    createdAt: number;
    pendingDelivery: boolean | null;
    items: ShareTargetItem[];
}
//# sourceMappingURL=types.d.ts.map