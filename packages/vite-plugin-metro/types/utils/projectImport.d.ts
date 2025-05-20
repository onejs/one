export declare const debug: (((...args: any[]) => any) & {
    namespace: string;
}) | undefined;
/**
 * Dynamically imports a module from the user's project root instead of this package's location.
 *
 * This avoids issues in monorepos or complex setups where dependencies like Expo or Metro
 * might be installed in nested `node_modules` directories.
 */
export declare function projectImport<T = any>(projectRoot: string, path: string): Promise<T>;
//# sourceMappingURL=projectImport.d.ts.map