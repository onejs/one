import type { InlineConfig } from 'vite';
export declare const dedupe: string[];
export declare function getBaseViteConfig({ mode, root, noCache, }: {
    mode: 'development' | 'production';
    root: string;
    noCache?: boolean;
}): Promise<InlineConfig>;
//# sourceMappingURL=getBaseViteConfig.d.ts.map