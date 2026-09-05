import type { Plugin } from 'vite';
export declare function getCodegen(projectRoot?: string): {
    req: NodeRequire;
    flowParser: any;
    typeScriptParser: any;
    RNCodegen: any;
};
export declare function transformReactNativeCodegen(code: string, id: string, projectRoot?: string): {
    code: string;
    map: any;
} | null | undefined;
export declare function rnCodegenPlugin(options?: {
    projectRoot?: string;
}): Plugin;
//# sourceMappingURL=rnCodegenPlugin.d.ts.map