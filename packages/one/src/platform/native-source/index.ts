export function callNativeSource(
  module: string,
  method: string,
  _args: unknown[],
  _contractHash: string
): Promise<unknown> {
  return Promise.reject(new Error(`native module ${module}.${method} requires an iOS or Android build`))
}
