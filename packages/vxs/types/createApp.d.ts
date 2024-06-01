export declare function createApp(options: {
    routes: Record<string, () => Promise<unknown>>;
}): {
    options: {
        routes: Record<string, () => Promise<unknown>>;
    };
    render: ({ path, preloads, loaderData, loaderProps, }: {
        path: string;
        preloads?: string[];
        loaderData?: any;
        loaderProps?: Object;
    }) => Promise<string>;
} | undefined;
//# sourceMappingURL=createApp.d.ts.map