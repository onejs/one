import type { ImagePickerMediaType, ImagePickerOptions } from './types';
export interface ImagePickerCropAspect {
    x: number;
    y: number;
}
export interface ResolvedImagePickerOptions {
    mediaTypes: ImagePickerMediaType[];
    selectionLimit: number;
    allowsEditing: boolean;
    aspect?: ImagePickerCropAspect;
    quality: number;
    videoMaxDuration: number;
    videoQuality: string;
}
export declare function resolveImagePickerOptions(options?: ImagePickerOptions, verb?: string): ResolvedImagePickerOptions;
export declare function resolveCameraOptions(options?: ImagePickerOptions): ResolvedImagePickerOptions;
//# sourceMappingURL=options.d.ts.map