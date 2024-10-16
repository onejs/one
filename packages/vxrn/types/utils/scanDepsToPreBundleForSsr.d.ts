/**
 * Since:
 *
 *   1) React is a CommonJS only package, and
 *   2) Vite SSR does not support direct import (or say, externalizing[^1]) of CommonJS packages
 *      (those packages need to be pre-bundled to work in SSR[^2]).
 *
 * We need to make React packages pre-bundled[^3] (or say, optimized) in the SSR environment, since
 * in the SSR environment, deps will default to be externalized and not pre-bundled.
 *
 * Since React is being pre-bundled, we need to make sure any other packages that depend on React are
 * also pre-bundled as well, because if a package is by default externalized (i.e. not pre-bundled),
 * it's import of React will be resolved to the externalized React (i.e. the one under `node_modules`)
 * but not the pre-bundled React, causing two different Reacts to be used in the same app and a `You might have more than one copy of React in the same app` error.
 *
 * Long story short, we need to pre-bundle React in SSR environment, and by doing so we also need to pre-bundle any other packages that depend on React.
 *
 * But we don't want to pre-bundle all the deps, since it's bad for performance and if a package is using things such as `__dirname` pre-bundling will break it.
 *
 * This function scans the `package.json` file of the project and returns a list of packages that depend on React, so that we can pre-bundle them in SSR environment.
 *
 * [^1]: https://vite.dev/guide/ssr.html#ssr-externals
 * [^2]: https://github.com/vitejs/vite/issues/9710#issuecomment-1217775350
 * [^3]: https://vite.dev/guide/dep-pre-bundling.html
 */
export declare function scanDepsToPreBundleForSsr(packageJsonPath: string, { parentDepNames, proceededDeps, pkgJsonContent, }?: {
    parentDepNames?: string[];
    proceededDeps?: Set<string>;
    /** If the content of the package.json is already read before calling this function, pass it here to avoid reading it again */
    pkgJsonContent?: any;
}): Promise<string[]>;
export declare function findDepPkgJsonPath(dep: any, dependent: any): Promise<string | undefined>;
//# sourceMappingURL=scanDepsToPreBundleForSsr.d.ts.map