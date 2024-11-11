import type { FilterPattern, PluginOption } from 'vite';
export declare function transformFlow(input: string, { development }?: {
    development?: boolean;
}): Promise<string>;
export declare function transformFlowFast(input: string): Promise<string>;
export type Options = {
    include?: FilterPattern;
    exclude?: FilterPattern;
};
export default function createFlowPlugin(opts?: Options): PluginOption;
//# sourceMappingURL=index.d.ts.map