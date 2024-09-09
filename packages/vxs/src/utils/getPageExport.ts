export const getPageExport = (exported) => {
  return (
    exported.default ||
    // because HMR fails with default exports, allow exporting something else
    // we just find the first non-loader export for now...
    (() => {
      const keys = Object.keys(exported)
      const nonLoader = keys.find((x) => x !== 'loader')
      if (nonLoader) {
        return exported[nonLoader]
      }
    })()
  )
}
