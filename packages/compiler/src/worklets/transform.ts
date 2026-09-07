import path from 'node:path'
import MagicString from 'magic-string'
import remapping from '@jridgewell/remapping'
import { parseSync } from 'oxc-parser'
import { bodyStartAfterDirectives, findWorkletCandidates, hasDirective } from './autoworklet'
import { createGlobalsSet } from './globals'
import { calculateWorkletHash } from './hash'
import { getClosureVariables } from './scope'
import { buildLocalFunction, serializeWorkletForUI } from './serialize'
import type { TransformWorkletsOptions } from './types'

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
])

/**
 * Innermost function whose body strictly contains `node`. A worklet marked
 * `limit-init-data-hoisting` puts its init data at the top of that body instead
 * of at module scope, so a `no-worklet-closure` parent can still reach it after
 * being serialized to a string and evaluated on a worklet runtime.
 */
function findEnclosingFunction(program: any, node: any): any {
  let best: any = undefined
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) {
      for (const c of n) walk(c)
      return
    }
    if (typeof n.type !== 'string') return
    // a node that does not span the target cannot contain it, so skip its subtree
    if (typeof n.start === 'number' && (n.start > node.start || n.end < node.end)) return
    if (
      FUNCTION_TYPES.has(n.type) &&
      n !== node &&
      n.body?.type === 'BlockStatement' &&
      n.body.start < node.start &&
      n.body.end > node.end &&
      (!best || n.body.start > best.body.start)
    ) {
      best = n
    }
    for (const key in n) {
      if (key === 'parent') continue
      walk(n[key])
    }
  }
  walk(program)
  return best
}

export function executeWorkletTransform(
  id: string,
  code: string,
  sourceMaps = false,
  options?: TransformWorkletsOptions,
  resolveVersionFn?: (projectRoot?: string, filename?: string) => string
): { code: string; map?: any } {
  const cleanId = id.split('?')[0]

  // react-native ships jsx inside plain .js files, and oxc disables jsx for .js
  // unless told otherwise, so those files fail to parse on their first element.
  // a .ts file is not tsx: `<T>(x: T) => x` is a generic arrow, not an element.
  const lang = /\.[cm]?ts$/.test(cleanId)
    ? ('ts' as const)
    : cleanId.endsWith('.tsx')
      ? ('tsx' as const)
      : ('jsx' as const)

  // 1. Initial quick parse to check if any worklet candidates exist
  const initialParse = parseSync(cleanId, code, {
    sourceType: 'module',
    lang,
  })

  if (initialParse.errors && initialParse.errors.length > 0) {
    const err = initialParse.errors[0]
    throw new Error(err.codeframe || err.message || 'Syntax Error while parsing worklet')
  }

  const initialCandidates = findWorkletCandidates(initialParse.program)
  if (initialCandidates.length === 0) {
    let map: any = undefined
    if (sourceMaps) {
      const ms = new MagicString(code)
      map = ms.generateMap({
        source: cleanId,
        file: cleanId,
        hires: true,
        includeContent: true,
      })
    }
    return { code, map }
  }

  // 2. Resolve plugin version and location
  const pluginVersion =
    options?.pluginVersion ||
    (resolveVersionFn ? resolveVersionFn(options?.projectRoot, cleanId) : '0.0.0')

  const globals = createGlobalsSet(options?.globals, options?.strictGlobal)

  let location = cleanId
  if (options?.relativeSourceLocation && options?.projectRoot) {
    location = path.relative(options.projectRoot, cleanId).replace(/\\/g, '/')
  }

  let currentCode = code
  const initDataDefs = new Map<string, string>()
  const passMaps: any[] = []

  // 3. Iterative bottom-up transformation
  // In each pass, we transform all innermost candidates (candidates that contain NO other candidates in their body).
  // All innermost candidates are disjoint, so they can be rewritten simultaneously in a single MagicString.
  let remainingPassBudget = 100
  while (remainingPassBudget-- > 0) {
    const parseResult = parseSync(cleanId, currentCode, {
      sourceType: 'module',
      lang,
    })

    if (parseResult.errors && parseResult.errors.length > 0) {
      const err = parseResult.errors[0]
      throw new Error(err.codeframe || err.message || 'Syntax Error while parsing worklet')
    }

    const candidates = findWorkletCandidates(parseResult.program)
    if (candidates.length === 0) {
      break
    }

    // Find ALL innermost candidates in this pass
    const innermostCandidates = candidates.filter((c) => {
      return !candidates.some(
        (other) =>
          other !== c &&
          other.fnNode.start >= c.fnNode.start &&
          other.fnNode.end <= c.fnNode.end
      )
    })

    if (innermostCandidates.length === 0) {
      throw new Error(`[worklets] Cyclic or unresolvable worklet nesting detected in ${cleanId}`)
    }

    const ms = new MagicString(currentCode)

    // init data declared inside an enclosing function body, keyed by that body's
    // start offset, so the same hash is not declared twice in one function.
    const inlinedInitData = new Map<number, Set<string>>()

    for (const candidate of innermostCandidates) {
      // `no-worklet-closure` says the worklet captures nothing, so it gets no
      // unpacker line and an empty `__closure`. it is what lets the worklets
      // runtime evaluate the serialized code with no closure to bind.
      const closureVars = hasDirective(candidate.fnNode, 'no-worklet-closure')
        ? []
        : getClosureVariables(candidate.fnNode, globals)
      const fnName = candidate.name

      const serializedCode = serializeWorkletForUI(candidate.fnNode, currentCode, fnName, closureVars)
      const workletHash = calculateWorkletHash(serializedCode)
      const initDataVar = `_worklet_${workletHash}_init_data`

      const initDataDecl = `var ${initDataVar} = {\n    code: ${JSON.stringify(serializedCode)},\n    location: ${JSON.stringify(location)}\n};`

      const enclosingFn = hasDirective(candidate.fnNode, 'limit-init-data-hoisting')
        ? findEnclosingFunction(parseResult.program, candidate.fnNode)
        : undefined

      if (enclosingFn) {
        // past the parent's own directive prologue, or inserting here would stop
        // its `'worklet'` from being a directive at all.
        const insertAt = bodyStartAfterDirectives(enclosingFn, currentCode)
        let declared = inlinedInitData.get(insertAt)
        if (!declared) {
          declared = new Set()
          inlinedInitData.set(insertAt, declared)
        }
        if (!declared.has(initDataVar)) {
          declared.add(initDataVar)
          ms.appendLeft(insertAt, `\n${initDataDecl}\n`)
        }
      } else if (!initDataDefs.has(initDataVar)) {
        initDataDefs.set(initDataVar, initDataDecl)
      }

      const localFnCode = buildLocalFunction(candidate.fnNode, currentCode, fnName)
      const localName = fnName || '_worklet'
      const closureProps = closureVars.map((v) => `${v}: ${v}`).join(', ')

      const iife = `(function () {
    var _e = [new (typeof global !== 'undefined' ? global : globalThis).Error(), 1, -27];
    var ${localName} = ${localFnCode};
    ${localName}.__closure = { ${closureProps} };
    ${localName}.__workletHash = ${workletHash};
    ${localName}.__pluginVersion = ${JSON.stringify(pluginVersion)};
    ${localName}.__initData = ${initDataVar};
    ${localName}.__stackDetails = _e;
    return ${localName};
})()`

      if (candidate.kind === 'function_declaration') {
        if (candidate.parent?.type === 'ExportNamedDeclaration') {
          ms.overwrite(candidate.parent.start, candidate.parent.end, `export var ${candidate.name} = ${iife};`)
        } else if (candidate.parent?.type === 'ExportDefaultDeclaration') {
          ms.overwrite(
            candidate.parent.start,
            candidate.parent.end,
            `var ${candidate.name || '_defaultWorklet'} = ${iife};\nexport default ${candidate.name || '_defaultWorklet'};`
          )
        } else {
          ms.overwrite(candidate.node.start, candidate.node.end, `var ${candidate.name} = ${iife};`)
        }
      } else if (candidate.kind === 'object_method') {
        ms.overwrite(candidate.node.start, candidate.node.end, `${candidate.name}: ${iife}`)
      } else {
        ms.overwrite(candidate.node.start, candidate.node.end, iife)
      }
    }

    if (sourceMaps) {
      passMaps.push(
        ms.generateMap({
          source: cleanId,
          file: cleanId,
          hires: true,
          includeContent: true,
        })
      )
    }

    currentCode = ms.toString()
  }

  // Check if any candidates remain untransformed after budget
  const finalCheck = parseSync(cleanId, currentCode, { sourceType: 'module', lang })
  const remaining = findWorkletCandidates(finalCheck.program)
  if (remaining.length > 0) {
    throw new Error(
      `[worklets] Exceeded maximum pass budget while transforming worklets in ${cleanId}. ${remaining.length} worklet(s) remained untransformed.`
    )
  }

  // Prepend initData definitions
  if (initDataDefs.size > 0) {
    const initDataCode = Array.from(initDataDefs.values()).join('\n') + '\n'
    const msPrepend = new MagicString(currentCode)
    msPrepend.prepend(initDataCode)
    if (sourceMaps) {
      passMaps.push(
        msPrepend.generateMap({
          source: cleanId,
          file: cleanId,
          hires: true,
          includeContent: true,
        })
      )
    }
    currentCode = msPrepend.toString()
  }

  let map: any = undefined
  if (sourceMaps && passMaps.length > 0) {
    if (passMaps.length === 1) {
      map = passMaps[0]
    } else {
      map = remapping(passMaps.slice().reverse(), () => null)
    }
    if (map) {
      map.sources = [cleanId]
      map.file = cleanId
    }
  }

  return {
    code: currentCode,
    map,
  }
}
