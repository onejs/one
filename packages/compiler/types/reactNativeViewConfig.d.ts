/**
 * View-config generation for react-native component specs, without babel.
 *
 * `@react-native/codegen` builds a full CodegenSchema with @babel/parser and
 * emits the module with @babel/generator, which is the last thing in the native
 * pipeline that runs babel at all: 11,774 babel calls per bundle of the soot
 * app, every one of them from codegen. The view config itself is a plain object
 * literal, so it can be read off the spec's own AST and printed as text.
 *
 * Only what a view config needs is modeled here: the prop list in declaration
 * order, the five prop types that get a custom attribute descriptor, the two
 * event handler shapes, and the command list. Everything else about a prop's
 * type is irrelevant to the runtime, which is why the generated `validAttributes`
 * is almost entirely `true`.
 *
 * TypeScript specs are parsed with oxc. React Native's own specs are Flow, which
 * oxc cannot parse, so those go through hermes-parser (which is not babel).
 */
export declare function parseSpec(code: string, filename: string, projectRoot?: string): any;
/**
 * Generate the replacement for a spec's default export, plus the `Commands`
 * export when the spec declares one. Returns null when the file is not a spec
 * this can handle, so the caller can leave it alone.
 */
export declare function generateViewConfig(program: any): {
    imports: string[];
    body: string;
} | null;
/** the full generated block, matching the layout codegen's file template emits */
export declare function renderViewConfigModule(result: {
    imports: string[];
    body: string;
}): string;
export declare function getLibraryName(filename: string): string;
//# sourceMappingURL=reactNativeViewConfig.d.ts.map