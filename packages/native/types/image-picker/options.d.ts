import type { ImagePickerMediaType, ImagePickerOptions } from './types';
export interface ResolvedImagePickerOptions {
    mediaTypes: ImagePickerMediaType[];
    selectionLimit: number;
}
export declare function resolveImagePickerOptions(options?: ImagePickerOptions): ResolvedImagePickerOptions;
export declare function resolveCameraOptions(options?: ImagePickerOptions): ResolvedImagePickerOptions;
export declare function createRequestGuard(): <T>(verb: string, run: () => Promise<T>) => Promise<T>;
//# sourceMappingURL=options.d.ts.map