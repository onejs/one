import type { WorkletCandidate } from './types'

// null-prototype: callee names are arbitrary source identifiers, so a plain
// object literal would resolve `constructor`, `toString` and friends off
// Object.prototype and hand back a non-iterable.
export const AUTOWORKLET_FUNCTION_ARGS: Record<string, number[]> = Object.assign(
  Object.create(null),
  {
    useFrameCallback: [0],
    useAnimatedStyle: [0],
    useAnimatedProps: [0],
    createAnimatedPropAdapter: [0],
    useDerivedValue: [0],
    useAnimatedScrollHandler: [0],
    useAnimatedGestureHandler: [0],
    useAnimatedReaction: [0, 1],
    createAnimatedComponent: [0],
    withTiming: [2],
    withSpring: [2],
    withDecay: [1],
    withRepeat: [3],
    runOnUI: [0],
    executeOnUIRuntimeSync: [0],
    scheduleOnUI: [0],
    runOnUISync: [0],
    runOnUIAsync: [0],
    runOnRuntime: [1],
    runOnRuntimeSync: [1],
    runOnRuntimeAsync: [1],
    scheduleOnRuntime: [1],
    runOnRuntimeSyncWithId: [1],
    scheduleOnRuntimeWithId: [1],
    useTapGesture: [0],
    usePanGesture: [0],
    usePinchGesture: [0],
    useRotationGesture: [0],
    useFlingGesture: [0],
    useLongPressGesture: [0],
    useNativeGesture: [0],
    useManualGesture: [0],
    useHoverGesture: [0],
    onBegin: [0],
    onStart: [0],
    onEnd: [0],
    onFinalize: [0],
    onUpdate: [0],
    onChange: [0],
    onTouchesDown: [0],
    onTouchesMove: [0],
    onTouchesUp: [0],
    onTouchesCancelled: [0],
  }
)

export function hasWorkletDirective(fnNode: any): boolean {
  if (!fnNode || !fnNode.body) return false

  // Directives array in Oxc
  if (Array.isArray(fnNode.body.directives)) {
    for (const d of fnNode.body.directives) {
      if (d.directive === 'worklet' || d.value === 'worklet') {
        return true
      }
    }
  }

  // First statement in body
  if (
    fnNode.body.type === 'BlockStatement' &&
    Array.isArray(fnNode.body.body) &&
    fnNode.body.body.length > 0
  ) {
    const first = fnNode.body.body[0]
    if (first.type === 'ExpressionStatement') {
      if (first.directive === 'worklet') return true
      if (
        first.expression &&
        first.expression.type === 'Literal' &&
        first.expression.value === 'worklet'
      ) {
        return true
      }
    }
  }

  return false
}

export function findWorkletCandidates(program: any): WorkletCandidate[] {
  const candidates: WorkletCandidate[] = []
  const seenStarts = new Set<number>()

  function addCandidate(candidate: WorkletCandidate) {
    const fnStart = candidate.fnNode.start
    if (seenStarts.has(fnStart)) return
    seenStarts.add(fnStart)
    candidates.push(candidate)
  }

  function getCalleeName(callee: any): string | null {
    if (!callee) return null
    if (callee.type === 'Identifier') {
      return callee.name
    }
    if (
      callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.property?.type === 'Identifier'
    ) {
      return callee.property.name
    }
    return null
  }

  function walk(node: any, parent: any) {
    if (!node || typeof node !== 'object') return

    // Check explicit worklets
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      if (hasWorkletDirective(node)) {
        let kind: WorkletCandidate['kind'] = 'function_expression'
        if (node.type === 'FunctionDeclaration') kind = 'function_declaration'
        else if (node.type === 'ArrowFunctionExpression') kind = 'arrow_function'

        let name = node.id?.name
        if (!name && parent?.type === 'VariableDeclarator' && parent.id?.name) {
          name = parent.id.name
        }

        addCandidate({
          node,
          fnNode: node,
          kind,
          name,
          parent,
          isAutoWorklet: false,
        })
      }
    } else if (
      node.type === 'Property' &&
      (node.method || node.value?.type === 'FunctionExpression' || node.value?.type === 'ArrowFunctionExpression')
    ) {
      const fn = node.value
      if (hasWorkletDirective(fn)) {
        addCandidate({
          node: node.method ? node : fn,
          fnNode: fn,
          kind: node.method
            ? 'object_method'
            : fn.type === 'ArrowFunctionExpression'
              ? 'arrow_function'
              : 'function_expression',
          name: node.key?.name,
          parent,
          isAutoWorklet: false,
        })
      }
    }

    // Check auto-workletized calls
    if (node.type === 'CallExpression') {
      const calleeName = getCalleeName(node.callee)
      const argIndices = calleeName ? AUTOWORKLET_FUNCTION_ARGS[calleeName] : undefined
      if (argIndices) {
        for (const idx of argIndices) {
          const arg = node.arguments[idx]
          if (!arg) continue

          if (
            arg.type === 'ArrowFunctionExpression' ||
            arg.type === 'FunctionExpression'
          ) {
            let name = arg.id?.name
            if (!name && parent?.type === 'VariableDeclarator' && parent.id?.name) {
              name = parent.id.name
            }
            addCandidate({
              node: arg,
              fnNode: arg,
              kind:
                arg.type === 'ArrowFunctionExpression'
                  ? 'arrow_function'
                  : 'function_expression',
              name,
              parent: node,
              isAutoWorklet: true,
            })
          } else if (arg.type === 'ObjectExpression' && Array.isArray(arg.properties)) {
            for (const prop of arg.properties) {
              if (prop.type === 'Property') {
                if (prop.method) {
                  addCandidate({
                    node: prop,
                    fnNode: prop.value,
                    kind: 'object_method',
                    name: prop.key?.name,
                    parent: arg,
                    isAutoWorklet: true,
                  })
                } else if (
                  prop.value?.type === 'ArrowFunctionExpression' ||
                  prop.value?.type === 'FunctionExpression'
                ) {
                  addCandidate({
                    node: prop.value,
                    fnNode: prop.value,
                    kind:
                      prop.value.type === 'ArrowFunctionExpression'
                        ? 'arrow_function'
                        : 'function_expression',
                    name: prop.key?.name,
                    parent: prop,
                    isAutoWorklet: true,
                  })
                }
              }
            }
          }
        }
      }
    }

    // Default traversal
    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) {
          walk(item, node)
        }
      } else if (child && typeof child === 'object') {
        walk(child, node)
      }
    }
  }

  walk(program, null)
  return candidates
}
