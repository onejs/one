import type { ResolvedConfig } from 'vite';
export type ConfigSubset = Pick<ResolvedConfig, 'base' | 'server' | 'define' | 'mode'>;
export declare function setResolvedConfig(_: ConfigSubset): void;
export declare function getResolvedConfig(): ConfigSubset;
//# sourceMappingURL=getResolvedConfigSubset.d.ts.map