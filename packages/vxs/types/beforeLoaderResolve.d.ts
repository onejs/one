import type { RenderAppProps } from './types';
type ClientLoaderResolver = (props: {
    loaderData: any;
    loaderServerData: any;
}) => any;
export declare function beforeLoaderResolve(resolver: ClientLoaderResolver): void;
export declare function resolveClientLoader(props: RenderAppProps): Promise<void>;
export {};
//# sourceMappingURL=beforeLoaderResolve.d.ts.map