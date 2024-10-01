export { build } from './exports/build'
export { dev } from './exports/dev'
export { serve } from './exports/serve'
export { prebuild } from './exports/prebuild'
export { clean } from './exports/clean'

export { type VXRNOptionsFilled, getOptionsFilled, fillOptions } from './utils/getOptionsFilled'
export * from './utils/getOptimizeDeps'
export * from './utils/getBaseViteConfig'
export * from './utils/patches'
export * from './utils/environmentUtils'
export * from './utils/getServerEntry'

export * from './plugins/rollupRemoveUnusedImports'

export * from './types'
