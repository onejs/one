type Conf = {
  enableReanimated?: boolean
  enableCompiler?: boolean
  enableNativeCSS?: boolean
}

export const configuration = {
  enableReanimated: false,
  enableCompiler: false,
  enableNativeCSS: false,
} satisfies Conf

export function configureVXRNCompilerPlugin(_: Conf) {
  Object.assign(configuration, _)
}
