/**
 * Constants in this file are copied from `packages/vite/src/node/constants.ts`.
 * Changes are marked with `// vxrn`.
 * Note that not all constants are copied.
 */

import type { RollupPluginHooks } from './typeUtils'

export const ROLLUP_HOOKS = [
  'buildStart',
  'buildEnd',
  'renderStart',
  'renderError',
  'renderChunk',
  'writeBundle',
  'generateBundle',
  'banner',
  'footer',
  'augmentChunkHash',
  'outputOptions',
  'renderDynamicImport',
  'resolveFileUrl',
  'resolveImportMeta',
  'intro',
  'outro',
  'closeBundle',
  'closeWatcher',
  'load',
  'moduleParsed',
  'watchChange',
  'resolveDynamicImport',
  'resolveId',
  'shouldTransformCachedModule',
  'transform',
] satisfies RollupPluginHooks[]
