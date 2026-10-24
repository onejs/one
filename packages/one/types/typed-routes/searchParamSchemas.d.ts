/**
 * Finds the Standard Schemas that components pass to `useSearchParams(schema)`.
 *
 * Nothing here runs app code or looks inside a schema. Each module is parsed as text,
 * the `useSearchParams` calls are located, and the schema argument is traced to the
 * exported name it comes from. The generated route types then refer to it with
 * `typeof import(file)[name]` and TypeScript works out the shape.
 */
/** `module` is an absolute file, or a package specifier TypeScript resolves itself. */
export type SearchSchemaRef = {
    module: string;
    isFile: boolean;
    name: string;
};
export type SearchSchemaScan = {
    schemas: SearchSchemaRef[];
    /** every file read, so a change to any of them can regenerate the types */
    files: Set<string>;
    unassociated: {
        file: string;
        line: number;
    }[];
};
/**
 * Scans a set of entry files (a route and its layouts) and everything they import
 * through relative or tsconfig-path specifiers. Packages are not followed.
 */
export declare function createSearchSchemaScanner(root: string): (entries: string[]) => SearchSchemaScan;
//# sourceMappingURL=searchParamSchemas.d.ts.map