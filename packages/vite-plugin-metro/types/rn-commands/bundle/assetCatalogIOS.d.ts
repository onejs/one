/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of https://github.com/facebook/react-native.
 */
import type { AssetData } from 'metro/private/Assets';
export declare function cleanAssetCatalog(catalogDir: string): void;
type ImageSet = {
    basePath: string;
    files: {
        name: string;
        src: string;
        scale: number;
    }[];
};
export declare function getImageSet(catalogDir: string, asset: AssetData, scales: ReadonlyArray<number>): ImageSet;
export declare function isCatalogAsset(asset: AssetData): boolean;
export declare function writeImageSet(imageSet: ImageSet): void;
export {};
//# sourceMappingURL=assetCatalogIOS.d.ts.map