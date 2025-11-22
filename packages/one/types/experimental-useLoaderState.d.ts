export declare function experimentalUseLoaderState<Loader extends Function>(loader: Loader): {
    data: any;
    refetch: () => void;
    state: "loading" | "idle";
    error: Error | null;
};
//# sourceMappingURL=experimental-useLoaderState.d.ts.map