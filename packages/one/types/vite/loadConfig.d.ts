import '../polyfills-server';
import type { One } from './types';
export declare function setOneOptions(next: One.PluginOptions): void;
export declare function loadUserOneOptions(command: 'serve' | 'build'): Promise<{
    config: {
        path: string;
        config: import("vite").UserConfig;
        dependencies: string[];
    };
    oneOptions: One.PluginOptions;
}>;
//# sourceMappingURL=loadConfig.d.ts.map