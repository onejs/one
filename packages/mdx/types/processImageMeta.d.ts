import type { ImageMeta } from './types';
/**
 * Process an image file and return its metadata.
 * Returns null if sharp is not installed or processing fails.
 */
export declare function processImageMeta(imagePath: string, opts?: {
    publicDir?: string;
}): Promise<ImageMeta | null>;
//# sourceMappingURL=processImageMeta.d.ts.map