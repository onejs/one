type Conf = {
  enableReanimated?: boolean
  enableCompiler?: boolean
}

export const configuration = {
  enableReanimated: false,
  enableCompiler: false,
} satisfies Conf

export function configureVXRNCompilerPlugin(_: Conf) {
  Object.assign(configuration, _)
}
