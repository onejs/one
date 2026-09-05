import path from 'node:path'
import MagicString from 'magic-string'
import remapping from '@jridgewell/remapping'
import { parseSync } from 'oxc-parser'
import { findWorkletCandidates } from './autoworklet'
import { createGlobalsSet } from './globals'
import { calculateWorkletHash } from './hash'
import { getClosureVariables } from './scope'
import { buildLocalFunction, serializeWorkletForUI } from './serialize'
import type { TransformWorkletsOptions } from './types'

export function executeWorkletTransform(
  id: string,
  code: string,
  sourceMaps = false,
  options?: TransformWorkletsOptions,
  resolveVersionFn?: (projectRoot?: string, filename?: string) => string
): { code: string; map?: any } {
  const cleanId = id.split('?')[0]

  // 1. Initial quick parse to check if any worklet candidates exist
  const initialParse = parseSync(cleanId, code, {
    sourceType: 'module',
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

    for (const candidate of innermostCandidates) {
      const closureVars = getClosureVariables(candidate.fnNode, globals)
      const fnName = candidate.name

      const serializedCode = serializeWorkletForUI(candidate.fnNode, currentCode, fnName, closureVars)
      const workletHash = calculateWorkletHash(serializedCode)
      const initDataVar = `_worklet_${workletHash}_init_data`

      if (!initDataDefs.has(initDataVar)) {
        const initDataObj = {
          code: serializedCode,
          location,
        }
        initDataDefs.set(
          initDataVar,
          `var ${initDataVar} = {\n    code: ${JSON.stringify(initDataObj.code)},\n    location: ${JSON.stringify(initDataObj.location)}\n};`
        )
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
  const finalCheck = parseSync(cleanId, currentCode, { sourceType: 'module' })
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
