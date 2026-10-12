import {
  getClosureVariables,
  JS_GLOBALS,
  transformHermesLoops,
} from '@vxrn/compiler/worklet-utils'
import { parseSync } from 'oxc-parser'

// native compiler hosts validate the complete loader before worklet serialization.
export function prepareBackgroundWorkletModule(source: string, id: string) {
  const code = transformHermesLoops(source, id)?.code ?? source
  const parsed = parseSync(id, code, { lang: 'js' })
  if (parsed.errors.length) throw new Error(parsed.errors[0].message)
  const captures = getClosureVariables(
    parsed.program.body[0],
    new Set([...JS_GLOBALS, 'arguments'])
  )
  if (captures.length) {
    throw new Error(
      `[worklet imports] ${id} requires unsupported runtime globals: ${captures.join(', ')}`
    )
  }
  return code
}
