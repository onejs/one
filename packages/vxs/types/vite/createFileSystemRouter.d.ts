import type { Plugin } from 'vite';
export type Options = {
    root: string;
    shouldIgnore?: (req: Request) => boolean;
    disableSSR?: boolean;
};
export declare function createFileSystemRouter(options: Options): Plugin;
//# sourceMappingURL=createFileSystemRouter.d.ts.map