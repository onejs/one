import type { Plugin } from 'vite';
export declare const clientTreeShakePlugin: (opts?: {
    runtime?: "vite" | "rolldown";
    routerRoot?: string;
}) => Plugin;
export declare function transformTreeShakeClient(code: string, id: string, root?: string, routerRoot?: string): Promise<{
    code: string;
    map: {
        version: number;
        sources: string[];
        names: string[];
        sourceRoot?: string | undefined;
        sourcesContent?: string[] | undefined;
        mappings: string;
        file: string;
    } | null;
} | undefined>;
//# sourceMappingURL=clientTreeShakePlugin.d.ts.map