export type TransformWorkletsOptions = {
    projectRoot?: string;
    bundleMode?: boolean;
    disableInlineStylesWarning?: boolean;
    disableSourceMaps?: boolean;
    disableWorkletClasses?: boolean;
    globals?: string[];
    relativeSourceLocation?: boolean;
    strictGlobal?: boolean;
    pluginVersion?: string;
};
export type WorkletCandidateKind = 'function_declaration' | 'function_expression' | 'arrow_function' | 'object_method';
export interface WorkletCandidate {
    node: any;
    fnNode: any;
    kind: WorkletCandidateKind;
    name?: string;
    parent?: any;
    isAutoWorklet: boolean;
}
//# sourceMappingURL=types.d.ts.map