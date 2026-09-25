export interface DocumentPickerAsset {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
}
export interface DocumentPickerSuccessResult {
    canceled: false;
    assets: DocumentPickerAsset[];
}
export interface DocumentPickerCanceledResult {
    canceled: true;
    assets: null;
}
export type DocumentPickerResult = DocumentPickerSuccessResult | DocumentPickerCanceledResult;
export interface DocumentPickerOptions {
    type?: string | string[];
    multiple?: boolean;
}
//# sourceMappingURL=types.d.ts.map