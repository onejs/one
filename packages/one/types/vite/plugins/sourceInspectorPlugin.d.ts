import type { Plugin } from 'vite';
type TransformOut = {
    code: string;
    map?: null;
} | undefined;
export declare function getSourceInspectorPath(filePath: string, cwd?: string): string;
export declare function resolveEditorFilePath(filePath: string, cwd?: string, fileExists?: (path: string) => boolean): string;
/**
 * Transforms JSX to inject data-one-source attributes using oxc-parser.
 */
export declare function injectSourceToJsx(code: string, id: string): Promise<TransformOut>;
export declare function sourceInspectorPlugin(opts?: {
    editor?: string;
}): Plugin[];
export {};
//# sourceMappingURL=sourceInspectorPlugin.d.ts.map