type SetupLoaderOptions = {
    resolve: {
        server: (props: {
            loaded: any;
        }) => any;
        client: (props: {
            loaded: any;
            serverData: any;
        }) => void;
    };
};
export declare const setupLoader: (options: SetupLoaderOptions) => void;
export declare const getSetupLoader: () => SetupLoaderOptions | null;
export {};
//# sourceMappingURL=setupLoader.d.ts.map