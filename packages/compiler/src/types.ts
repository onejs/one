import type { TransformBabelOptions } from './transformBabel'

export type Options = {
  mode: 'serve' | 'serve-cjs' | 'build'
  jsxImportSource?: string
  tsDecorators?: boolean
  plugins?: [string, Record<string, any>][]
  forceJSX?: boolean
  noHMR?: boolean
  production?: boolean
  babel?: TransformBabelOptions
}
