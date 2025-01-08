type ServerContext = {
    css?: string[];
    postRenderData?: any;
    loaderData?: any;
    loaderProps?: any;
    mode?: 'spa' | 'ssg' | 'ssr';
};
type MaybeServerContext = null | ServerContext;
export declare const SERVER_CONTEXT_POST_RENDER_STRING = "_one_post_render_data_";
export declare function setServerContext(c: ServerContext): void;
export declare function getServerContext(): MaybeServerContext;
export declare function ServerContextScript(): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=serverContext.d.ts.map