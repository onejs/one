const getPageLikeExports = (x: string) => x !== "loader" && x[0].toUpperCase() === x[0];

export const getPageExport = (exported: Record<string, any>) => {
  return (
    exported.default ||
    // because HMR fails with default exports, allow exporting something else
    // we just find the first non-loader export for now...
    (() => {
      const keys = Object.keys(exported);

      if (process.env.NODE_ENV === "development") {
        const upperCaseExports = keys.filter(getPageLikeExports);
        if (upperCaseExports.length > 1) {
          console.warn(`Warning: You've exported more than one uppercase non-default export.

If there is no default export, One uses the first capitalized non-default export.
This is because React Refresh, the hot reloading library, does not work on default
exports, so you may prefer to use non-default exports. But exporting multiple can
cause issues, as browser clients and server runtimes may not sort the export keys
the same.

Be sure to only export a single capitalized non-default export per-route.
            `);
        }
      }

      const nonLoader = keys.find(getPageLikeExports);
      if (nonLoader) {
        return exported[nonLoader];
      }
    })()
  );
};
