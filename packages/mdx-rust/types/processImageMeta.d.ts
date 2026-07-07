import type { ImageMeta } from './types';
/** Read an image's dimensions and a tiny blur placeholder. Null if sharp is
 *  not installed or the file is missing. */
export declare function processImageMeta(imagePath: string, opts?: {
    publicDir?: string;
}): Promise<ImageMeta | null>;
//# sourceMappingURL=processImageMeta.d.ts.map