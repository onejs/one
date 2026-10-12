// react-native ships codegenNativeCommands as flow, which the platform project cannot parse.
// tests that assert dispatched commands mock it themselves.
export default function codegenNativeCommands<T extends object>({
  supportedCommands,
}: {
  supportedCommands: readonly string[]
}): T {
  return Object.fromEntries(supportedCommands.map((name) => [name, () => {}])) as T
}
