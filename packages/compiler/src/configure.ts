type Conf = {
  disableReanimated: boolean
}

export const configuration: Conf = {
  disableReanimated: true,
}

export function configureVXRNCompilerPlugin(_: Conf) {
  Object.assign(configuration, _)
}
