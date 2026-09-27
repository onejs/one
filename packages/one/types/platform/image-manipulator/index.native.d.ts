import type { ImageTransformOptions, ImageTransformResult } from '../specs/OneImageManipulator.nitro';
export type { ImageCrop, ImageFormat, ImageResize, ImageTransformResult } from '../specs/OneImageManipulator.nitro';
export type ImageManipulatorOptions = Omit<ImageTransformOptions, 'format'> & {
    format?: ImageTransformOptions['format'];
};
declare function transform(uri: string, options?: ImageManipulatorOptions): Promise<ImageTransformResult>;
export declare const ImageManipulator: Readonly<{
    transform: typeof transform;
}>;
//# sourceMappingURL=index.native.d.ts.map