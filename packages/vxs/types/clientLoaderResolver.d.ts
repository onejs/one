import type { RenderAppProps } from './types';
type ClientLoaderResolver = (props: {
    loaderData: any;
    loaderServerData: any;
}) => any;
export declare function onClientLoaderResolve(resolver: ClientLoaderResolver): void;
export declare function resolveClientLoader(props: RenderAppProps): Promise<void>;
export {};
//# sourceMappingURL=clientLoaderResolver.d.ts.map