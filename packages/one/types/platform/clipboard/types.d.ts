export type ClipboardContentType = 'plain-text' | 'image' | 'url' | 'html';
export type ClipboardStringFormat = 'plainText' | 'html';
export interface ClipboardGetStringOptions {
    preferredFormat?: ClipboardStringFormat;
}
export interface ClipboardSetStringOptions {
    inputFormat?: ClipboardStringFormat;
}
export interface ClipboardGetImageOptions {
    format: 'png' | 'jpeg';
    jpegQuality?: number;
}
export interface ClipboardImage {
    data: string;
    size: {
        width: number;
        height: number;
    };
}
export interface ClipboardEvent {
    contentTypes: ClipboardContentType[];
}
export interface ClipboardSubscription {
    remove(): void;
}
//# sourceMappingURL=types.d.ts.map