import type { Connect, Plugin } from 'vite';
export type Options = {
    root: string;
    shouldIgnore?: (req: Connect.IncomingMessage) => boolean;
    disableSSR?: boolean;
};
export declare function createFileSystemRouter(options: Options): Plugin;
//# sourceMappingURL=createFileSystemRouter.d.ts.map