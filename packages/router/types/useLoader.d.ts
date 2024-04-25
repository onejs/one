export declare function useLoader<Loader extends Function, Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned;
export type LoaderProps<Params extends Object = Record<string, any>> = {
    path: string;
    params: Params;
};
//# sourceMappingURL=useLoader.d.ts.map