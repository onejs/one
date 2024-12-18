import type { RenderAppProps } from './types';
type LoaderResolverProps = Pick<RenderAppProps, 'loaderData' | 'loaderServerData' | 'loaderProps'>;
type ClientLoaderResolver = (props: LoaderResolverProps) => any;
export declare function onClientLoaderResolve(resolver: ClientLoaderResolver): void;
export declare function resolveClientLoader(props: LoaderResolverProps): any;
export {};
//# sourceMappingURL=clientLoaderResolver.d.ts.map