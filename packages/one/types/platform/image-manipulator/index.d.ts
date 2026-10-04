import type { ImageTransformOptions, ImageTransformResult } from '../specs/OneImageManipulator.nitro';
export type { ImageCrop, OneImageFormat as ImageFormat, ImageResize, ImageTransformResult, } from '../specs/OneImageManipulator.nitro';
export type ImageManipulatorOptions = Omit<ImageTransformOptions, 'format'> & {
    format?: ImageTransformOptions['format'];
};
export declare const ImageManipulator: Readonly<{
    transform: (_uri: string, _options?: ImageManipulatorOptions) => Promise<ImageTransformResult>;
}>;
//# sourceMappingURL=index.d.ts.map