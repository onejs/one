import type { Options } from './types';
export interface Output {
    code: string;
    map?: any;
}
export declare function shouldStripFlow(id: string, code: string): boolean;
export declare function transformSWC(id: string, code: string, options: Options & {
    es5?: boolean;
}, swcOptions?: any): Promise<Output | undefined>;
export declare const transformOxc: typeof transformSWC;
export declare function shouldSourceMap(): boolean;
export declare const transformSWCStripJSX: (id: string, code: string) => Promise<{
    code: string;
    map: any;
} | undefined>;
export declare const transformOxcStripJSX: (id: string, code: string) => Promise<{
    code: string;
    map: any;
} | undefined>;
//# sourceMappingURL=transformSWC.d.ts.map