/**
 * babel plugin that inlines process.env.ONE_SERVER_URL at build time
 * so native prod bundles know where to fetch loaders from.
 */
export default function pluginInlineOneServerUrl(): {
    visitor: {
        MemberExpression(nodePath: any): void;
    };
};
//# sourceMappingURL=inline-one-server-url.d.ts.map