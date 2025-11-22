export declare function refetchLoader(pathname: string): Promise<void>;
export declare function useLoaderState<Loader extends Function = any, Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown>(loader?: Loader): Loader extends undefined ? {
    refetch: () => Promise<void>;
    state: 'idle' | 'loading';
} : {
    data: Returned extends Promise<any> ? Awaited<Returned> : Returned;
    refetch: () => Promise<void>;
    state: 'idle' | 'loading';
};
export declare function useLoader<Loader extends Function, Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned;
//# sourceMappingURL=useLoader.d.ts.map