/**
 * route modules have to be read through the built server entry's own route map,
 * never by importing whichever output chunk happens to contain them.
 *
 * a bundler makes no promise that a chunk re-exports a module's bindings under
 * their source names. when a route is both dynamically imported by the entry and
 * statically imported by another route (docs pages mirrored under a second url,
 * say), or when the app sets `output.strictExecutionOrder`, rolldown emits the
 * chunk as
 *
 *   export { loader as a, init__slug_ as i, _slug__exports as n, generateStaticParams as r }
 *
 * so every read by source name comes back undefined: the build then reports a
 * route that exports generateStaticParams as missing it, and any loader on that
 * route silently stops running.
 *
 * the entry's `import.meta.glob` map is written by the bundler itself, which
 * rewrites each entry to whatever preserves the real namespace
 * (`import(chunk).then((n) => (n.i(), n.n))` for the wrapped case above). so it
 * resolves correctly no matter how the chunking lands.
 */
/** the key the entry's globs use: `./posts/[slug]+ssg.tsx` -> `/app/posts/[slug]+ssg.tsx` */
export declare function routeEntryKey(routerRoot: string, routeFile: string): string;
/**
 * resolve one route's exports out of an already-loaded server entry namespace.
 * returns null when the entry has no such route.
 */
export declare function getRouteExportsFromEntry(entry: any, routerRoot: string, routeFile: string): Promise<Record<string, any> | null>;
//# sourceMappingURL=routeExportsFromEntry.d.ts.map