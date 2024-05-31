export declare function createApp(options: {
    routes: Record<string, () => Promise<unknown>>;
}): {
    options: {
        routes: Record<string, () => Promise<unknown>>;
    };
    render: ({ path }: {
        path: string;
    }) => Promise<string>;
};
//# sourceMappingURL=createApp.d.ts.map