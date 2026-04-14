import type { Plugin } from 'vite';
export declare function getSourceInspectorPath(filePath: string, cwd?: string): string;
export declare function resolveEditorFilePath(filePath: string, cwd?: string, fileExists?: (path: string) => boolean): string;
export declare function sourceInspectorPlugin(opts?: {
    editor?: string;
}): Plugin[];
//# sourceMappingURL=sourceInspectorPlugin.d.ts.map