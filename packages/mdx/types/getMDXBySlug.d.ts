import type { Frontmatter, UnifiedPlugin } from "./types";
export declare const getMDXBySlug: (
  basePath: string,
  slug: string,
  extraPlugins?: UnifiedPlugin,
) => Promise<{
  frontmatter: Frontmatter;
  code: string;
}>;
export declare function getAllVersionsFromPath(fromPath: string): string[];
//# sourceMappingURL=getMDXBySlug.d.ts.map
