import type { VXRNConfig } from '../types';
export declare const resolveFile: (path: string) => string;
type BuildOptions = {
    step?: string;
    page?: string;
};
export declare const build: (optionsIn: VXRNConfig, buildOptions?: BuildOptions) => Promise<void>;
export {};
//# sourceMappingURL=build.d.ts.map