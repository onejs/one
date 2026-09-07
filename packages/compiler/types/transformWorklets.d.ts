export declare const REANIMATED_AUTOWORKLETIZATION_KEYWORDS: string[];
export declare function shouldTransformWorklets({ id, code }: {
    id: string;
    code: string;
}): boolean;
export declare function getWorkletsVersion(projectRoot?: string, filename?: string): string;
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
export declare function transformWorklets(id: string, code: string, sourceMaps?: boolean, options?: TransformWorkletsOptions): Promise<{
    code: string;
    map?: any;
}>;
//# sourceMappingURL=transformWorklets.d.ts.map