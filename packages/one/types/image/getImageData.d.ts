export type ImageData = {
    src: string;
    width: number;
    height: number;
    blurDataURL: string;
};
export type ImageMeta = {
    width: number;
    height: number;
    blurDataURL: string;
};
export declare function getSharp(): Promise<typeof import('sharp') | null>;
/**
 * Process an image file and return its metadata.
 * Internal helper used by both getImageData and imageDataPlugin.
 */
export declare function processImageMeta(filePath: string): Promise<ImageMeta | null>;
/**
 * Get image metadata (dimensions and blur placeholder) for an image file.
 *
 * @param filePath - Path to the image file. Paths starting with "/" are resolved
 *                   relative to ./public (e.g., "/images/hero.jpg" -> "./public/images/hero.jpg")
 * @returns ImageData with src, width, height, and blurDataURL
 *
 * @example
 * // From a loader or build script
 * const data = await getImageData('/images/hero.jpg')
 * // { src: '/images/hero.jpg', width: 1920, height: 1080, blurDataURL: '...' }
 *
 * // Or with a relative path
 * const data = await getImageData('../public/images/hero.jpg')
 */
export declare function getImageData(filePath: string): Promise<ImageData>;
//# sourceMappingURL=getImageData.d.ts.map