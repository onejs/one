export declare function getVitePath(
  rootPath: string,
  importer: string,
  moduleName: string,
  resolver: (moduleName: string, importer: string) => Promise<string | undefined>,
  resolverWithPlugins: (
    moduleName: string,
    importer: string
  ) => Promise<string | undefined>,
  absolute?: boolean
): Promise<string>
//# sourceMappingURL=getVitePath.d.ts.map
