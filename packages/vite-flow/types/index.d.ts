import type { FilterPattern, PluginOption } from 'vite';
export { transformFlow, transformFlowBabel } from './transformFlowBabel';
export type Options = {
    include?: FilterPattern;
    exclude?: FilterPattern;
};
export default function createFlowPlugin(opts?: Options): PluginOption;
//# sourceMappingURL=index.d.ts.map