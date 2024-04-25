import type { Connect, Plugin } from 'vite';
type Options = {
    root: string;
    shouldIgnore?: (req: Connect.IncomingMessage) => boolean;
    disableSSR?: boolean;
};
export declare function createFileSystemRouter(options: Options): Plugin;
export {};
//# sourceMappingURL=createFileSystemRouter.d.ts.map