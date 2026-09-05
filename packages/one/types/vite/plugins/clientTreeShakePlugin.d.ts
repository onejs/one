import type { Plugin } from 'vite';
export declare const clientTreeShakePlugin: (opts?: {
    runtime?: "vite" | "rolldown";
}) => Plugin;
export declare function transformTreeShakeClient(code: string, id: string, root?: string): Promise<{
    code: string;
    map: import("magic-string").SourceMap;
} | undefined>;
//# sourceMappingURL=clientTreeShakePlugin.d.ts.map