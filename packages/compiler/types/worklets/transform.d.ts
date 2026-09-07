import type { TransformWorkletsOptions } from './types';
export declare function prepareWorkletsForReactCompiler(id: string, code: string, sourceMaps?: boolean): {
    code: string;
    map?: any;
} | null;
export declare function executeWorkletTransform(id: string, code: string, sourceMaps?: boolean, options?: TransformWorkletsOptions, resolveVersionFn?: (projectRoot?: string, filename?: string) => string): {
    code: string;
    map?: any;
};
//# sourceMappingURL=transform.d.ts.map