export declare function useLoader<Loader extends Function, Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned;
export declare function useLoaderState<Loader extends Function = any, Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown>(loader?: Loader): Loader extends undefined ? {
    refetch: () => void;
    state: 'idle' | 'loading';
} : {
    data: Returned extends Promise<any> ? Awaited<Returned> : Returned;
    refetch: () => void;
    state: 'idle' | 'loading';
};
//# sourceMappingURL=useLoader.d.ts.map