type PluginOptions = {
    ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY?: string;
    ONE_ROUTER_ROOT_FOLDER_NAME?: string;
    ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING?: string;
};
declare function oneRouterMetroPlugin(_: any, options: PluginOptions): {
    name: string;
    visitor: {
        MemberExpression(path: any, state: any): void;
    };
};
export default oneRouterMetroPlugin;
//# sourceMappingURL=one-router-metro.d.ts.map