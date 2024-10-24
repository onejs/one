import type { Frontmatter } from './types';
export type UnifiedPlugin = import('unified').Plugin[];
export declare const getMDXBySlug: (basePath: string, slug: string, extraPlugins?: UnifiedPlugin) => Promise<{
    frontmatter: Frontmatter;
    code: string;
}>;
export declare function getMDX(source: string, extraPlugins?: UnifiedPlugin): Promise<{
    code: string;
    frontmatter: {
        [key: string]: any;
    };
    errors: import("esbuild").Message[];
    matter: Omit<import("gray-matter").GrayMatterFile<string>, "data"> & {
        data: {
            [key: string]: any;
        };
    };
}>;
export declare function getAllVersionsFromPath(fromPath: string): string[];
//# sourceMappingURL=getMDXBySlug.d.ts.map