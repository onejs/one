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
//# sourceMappingURL=reactNativeCodegen.d.ts.map