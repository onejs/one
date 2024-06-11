type SearchParams = Record<string, string | string[]>;
export type UrlObject = {
    unstable_globalHref: string;
    pathname: string;
    readonly params: SearchParams;
    segments: string[];
    isIndex: boolean;
};
export declare function getNormalizedStatePath({ path: statePath, params, }: {
    path: string;
    params: any;
}, baseUrl?: string): Pick<UrlObject, 'segments' | 'params'>;
export {};
//# sourceMappingURL=getNormalizedStatePath.d.ts.map