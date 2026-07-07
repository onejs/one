import { type HastPluginInput, type MdastPluginInput } from 'satteri';
import { type SatteriExpressiveCodeOptions } from 'satteri-expressive-code';
import type { Frontmatter } from './types';
export type GetMDXOptions = {
    /** public directory for resolving image paths that start with `/` (default: ./public) */
    publicDir?: string;
    /**
     * Expressive Code (Shiki) options: themes, frames, styleOverrides, plugins.
     * Pass `false` to skip syntax highlighting entirely. Defaults to the
     * `github-dark` theme.
     */
    expressiveCode?: SatteriExpressiveCodeOptions | false;
    /** extra satteri mdast plugins, e.g. a hero/demo source injector */
    mdastPlugins?: MdastPluginInput[];
    /** extra satteri hast plugins */
    hastPlugins?: HastPluginInput[];
};
/**
 * Compile an MDX string to an evaluatable component module using satteri (Rust)
 * for parsing/compilation and Expressive Code (Shiki) for code highlighting.
 * Evaluate the returned `code` with `getMDXComponent` from `@vxrn/mdx-rust/client`.
 */
export declare function getMDX(source: string, options?: GetMDXOptions): Promise<{
    frontmatter: Frontmatter;
    code: string;
}>;
//# sourceMappingURL=getMDX.d.ts.map