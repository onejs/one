import type { Plugin } from 'vite';
export type Options = {
    shouldIgnore?: (req: Request) => boolean;
    disableSSR?: boolean;
};
export declare function createFileSystemRouter(options: Options): Plugin;
//# sourceMappingURL=createFileSystemRouter.d.ts.map