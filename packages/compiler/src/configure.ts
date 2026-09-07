import type { Environment } from './types'

type CompilerFilter =
  | boolean
  | RegExp
  | ((id: string, environment: Environment) => boolean)

type CompilerConfig =
  | boolean
  | Environment[]
  | RegExp
  | ((id: string, environment: Environment) => boolean)
  | {
      web?: CompilerFilter
      native?: CompilerFilter
    }

type Conf = {
  enableNativewind?: boolean
  enableReanimated?: boolean
  enableNativeWorklets?: boolean
  enableCompiler?: CompilerConfig
  enableNativeCSS?: boolean
}

export const configuration: Conf = {
  enableNativewind: false,
  enableReanimated: false,
  enableNativeWorklets: true,
  enableCompiler: false,
  enableNativeCSS: false,
}

export function isNativeWorkletsEnabled() {
  if (
    process.env.VXRN_NATIVE_WORKLETS === 'false' ||
    process.env.VXRN_NATIVE_WORKLETS === '0'
  ) {
    return false
  }
  return configuration.enableNativeWorklets !== false
}

export function configureVXRNCompilerPlugin(_: Conf) {
  Object.assign(configuration, _)
}
