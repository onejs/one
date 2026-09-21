export declare const debug: (((...args: any[]) => any) & {
    namespace: string;
}) | undefined;
/**
 * Dynamically imports a module from the user's project root instead of this package's location.
 *
 * This avoids issues in monorepos or complex setups where Metro might be
 * installed in a nested `node_modules` directory.
 */
export declare function projectImport<T = any>(projectRoot: string, path: string): Promise<T>;
export declare function projectResolve(projectRoot: string, path: string): string;
//# sourceMappingURL=projectImport.d.ts.map