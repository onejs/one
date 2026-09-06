import { transformSync } from 'oxc-transform'
import { bodyStartAfterDirectives } from './autoworklet'

/**
 * oxc returns empty code plus errors rather than throwing, and an empty
 * `__initData.code` only fails much later on a worklet runtime with a message
 * that names none of this. So refuse to emit one.
 */
function assertTransformed(
  transformed: { code: string; errors?: any[] },
  name: string | undefined,
  what: string
) {
  const error = transformed.errors?.[0]
  if (error) {
    throw new Error(
      `[worklets] failed to build ${what} code for ${name || 'anonymous worklet'}: ${error.message || error}`
    )
  }
  if (!transformed.code.trim()) {
    throw new Error(
      `[worklets] built empty ${what} code for ${name || 'anonymous worklet'}`
    )
  }
}

/**
 * Serializes a worklet function into a string for the Hermes UI thread (__initData.code).
 * Includes injected unpacker: `const { var1, var2 } = this.__closure ?? this._closure;`
 * Strips TypeScript types and formats via oxc-transform.
 */
export function serializeWorkletForUI(
  fnNode: any,
  code: string,
  name: string | undefined,
  closureVars: string[]
): string {
  let rawParams = ''
  if (fnNode.params && fnNode.params.length > 0) {
    const pStart = fnNode.params[0].start
    const pEnd = fnNode.params[fnNode.params.length - 1].end
    rawParams = code.slice(pStart, pEnd)
  }

  let rawBody = ''
  if (fnNode.body.type === 'BlockStatement') {
    const bodyStart = bodyStartAfterDirectives(fnNode, code)
    const bodyEnd = fnNode.body.end - 1
    rawBody = code.slice(bodyStart, bodyEnd)
  } else {
    rawBody = `return ${code.slice(fnNode.body.start, fnNode.body.end)};`
  }

  const unpacker = closureVars.length > 0
    ? `const { ${closureVars.join(', ')} } = this.__closure ?? this._closure;\n`
    : ''

  const asyncPrefix = fnNode.async ? 'async ' : ''
  const genPrefix = fnNode.generator ? '*' : ''
  const fnName = name || '_worklet'

  const fullFn = `${asyncPrefix}function${genPrefix} ${fnName}(${rawParams}) {\n${unpacker}${rawBody}\n}`

  const transformed = transformSync('worklet.ts', fullFn)
  assertTransformed(transformed, name, 'serialized')
  return transformed.code.trim()
}

/**
 * Builds the local JavaScript function to run on the JS thread inside the worklet IIFE.
 * Strips TypeScript types and the 'worklet' directive.
 */
export function buildLocalFunction(
  fnNode: any,
  code: string,
  name: string | undefined
): string {
  let rawParams = ''
  if (fnNode.params && fnNode.params.length > 0) {
    const pStart = fnNode.params[0].start
    const pEnd = fnNode.params[fnNode.params.length - 1].end
    rawParams = code.slice(pStart, pEnd)
  }

  let rawBody = ''
  if (fnNode.body.type === 'BlockStatement') {
    const bodyStart = bodyStartAfterDirectives(fnNode, code)
    const bodyEnd = fnNode.body.end - 1
    rawBody = code.slice(bodyStart, bodyEnd)
  } else {
    rawBody = code.slice(fnNode.body.start, fnNode.body.end)
  }

  let rawFn = ''
  const asyncPrefix = fnNode.async ? 'async ' : ''
  const genPrefix = fnNode.generator ? '*' : ''

  if (fnNode.type === 'ArrowFunctionExpression') {
    if (fnNode.body.type === 'BlockStatement') {
      rawFn = `${asyncPrefix}(${rawParams}) => {\n${rawBody}\n}`
    } else {
      rawFn = `${asyncPrefix}(${rawParams}) => (${rawBody})`
    }
  } else {
    // an anonymous `function (x) {}` does not parse on its own, and this is
    // emitted into `var <localName> = ...`, where a name binds only inside the
    // function itself.
    rawFn = `${asyncPrefix}function${genPrefix} ${name || '_worklet'}(${rawParams}) {\n${rawBody}\n}`
  }

  const transformed = transformSync('local.ts', rawFn)
  assertTransformed(transformed, name, 'local')
  return transformed.code.trim().replace(/;$/, '')
}
