import { createDebugger } from '@vxrn/debug'

export const { debug } = createDebugger('vxrn:compiler-plugin')

export const runtimePublicPath = '/@react-refresh'

export const asyncGeneratorRegex = /(async \*|async function\*|for await)/
