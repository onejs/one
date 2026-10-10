export interface SwiftPackageViewProps {
  // the package the bundler named from the imported file's swift package
  packageName: string
  // a typed view's struct name, or empty for the package's @main view
  view: string
  // the package contract a typed view was generated from, else empty
  contractHash: string
  // the importing element's props: a typed view's stored properties, or the
  // json the @main view's view(props:) reads
  props: Record<string, unknown>
  // the imported file's @main is an App: the root fills its parent
  fill: boolean
}
