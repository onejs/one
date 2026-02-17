import type { Environment } from './types'

type CompilerFilter = boolean | RegExp | ((id: string, environment: Environment) => boolean)

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
  enableCompiler?: CompilerConfig
  enableNativeCSS?: boolean
}

export const configuration: Conf = {
  enableNativewind: false,
  enableReanimated: false,
  enableCompiler: false,
  enableNativeCSS: false,
}

export function configureVXRNCompilerPlugin(_: Conf) {
  Object.assign(configuration, _)
}
