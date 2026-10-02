export interface KotlinSourceViewProps {
  // the kotlin source id the bundler derived from the imported file's path
  source: string
  // the @Composable function's name
  view: string
  contractHash: string
  // the importing element's props, the composable's parameters
  props: Record<string, unknown>
}
