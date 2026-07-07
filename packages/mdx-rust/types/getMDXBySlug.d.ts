import { type GetMDXOptions } from './getMDX';
import type { Frontmatter } from './types';
export declare const getMDXBySlug: (basePath: string, slug: string, options?: GetMDXOptions) => Promise<{
    frontmatter: Frontmatter;
    code: string;
}>;
export declare function getAllVersionsFromPath(fromPath: string): string[];
//# sourceMappingURL=getMDXBySlug.d.ts.map