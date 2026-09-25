export interface SwiftPackageViewProps {
  // the package the bundler named from the imported file's swift package
  packageName: string
  // the importing element's props, handed to the package's view(props:)
  props: Record<string, unknown>
  // the imported file's @main is an App: the root fills its parent
  fill: boolean
}
