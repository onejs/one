import type { Frontmatter, UnifiedPlugin } from './types';
export type GetMDXOptions = {
    extraPlugins?: UnifiedPlugin;
    /** Public directory for resolving image paths starting with / (default: ./public) */
    publicDir?: string;
};
export declare function getMDX(source: string, extraPluginsOrOptions?: UnifiedPlugin | GetMDXOptions): Promise<{
    frontmatter: Frontmatter;
    code: string;
}>;
//# sourceMappingURL=getMDX.d.ts.map