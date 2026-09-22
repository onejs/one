export type ImagePickerMediaType = 'images' | 'videos';
export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
}
export interface ImagePickerSuccessResult {
    canceled: false;
    assets: ImagePickerAsset[];
}
export interface ImagePickerCanceledResult {
    canceled: true;
    assets: null;
}
export type ImagePickerResult = ImagePickerSuccessResult | ImagePickerCanceledResult;
export interface ImagePickerOptions {
    mediaTypes?: ImagePickerMediaType | ImagePickerMediaType[];
    selectionLimit?: number;
}
export type ImagePickerPermissionResponse = Readonly<{
    status: 'granted' | 'denied' | 'undetermined';
    granted: boolean;
    canAskAgain: boolean;
}>;
//# sourceMappingURL=types.d.ts.map