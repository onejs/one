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
  }
)

// gesture builder callbacks are NOT matched by name. `onChange`, `onStart` and
// `onEnd` are ordinary identifiers in plenty of unrelated code, and turning one
// of those callbacks into a worklet ships a function to the UI runtime that was
// never written for it. the callback only counts when the receiver is a
// `Gesture.<Kind>()` chain, which is what the babel plugin requires too.
export const GESTURE_BUILDER_METHODS = new Set([
  'onBegin',
  'onStart',
  'onEnd',
  'onFinalize',
  'onUpdate',
  'onChange',
  'onTouchesDown',
  'onTouchesMove',
  'onTouchesUp',
  'onTouchesCancelled',
])

const GESTURE_KINDS = new Set([
  'Tap',
  'Pan',
  'Pinch',
  'Rotation',
  'Fling',
  'LongPress',
  'ForceTouch',
  'Native',
  'Manual',
  'Race',
  'Simultaneous',
  'Exclusive',
  'Hover',
])

// `FadeIn.duration(300).withCallback(fn)` - same shape, same reason for gating
// on the chain root rather than on the method name.
const LAYOUT_ANIMATIONS = new Set(
  `BounceIn BounceInDown BounceInLeft BounceInRight BounceInUp BounceOut BounceOutDown
   BounceOutLeft BounceOutRight BounceOutUp FadeIn FadeInDown FadeInLeft FadeInRight FadeInUp
   FadeOut FadeOutDown FadeOutLeft FadeOutRight FadeOutUp FlipInEasyX FlipInEasyY FlipInXDown
   FlipInXUp FlipInYLeft FlipInYRight FlipOutEasyX FlipOutEasyY FlipOutXDown FlipOutXUp
   FlipOutYLeft FlipOutYRight LightSpeedInLeft LightSpeedInRight LightSpeedOutLeft
   LightSpeedOutRight PinwheelIn PinwheelOut RollInLeft RollInRight RollOutLeft RollOutRight
   RotateInDownLeft RotateInDownRight RotateInUpLeft RotateInUpRight RotateOutDownLeft
   RotateOutDownRight RotateOutUpLeft RotateOutUpRight SlideInDown SlideInLeft SlideInRight
   SlideInUp SlideOutDown SlideOutLeft SlideOutRight SlideOutUp StretchInX StretchInY
   StretchOutX StretchOutY ZoomIn ZoomInDown ZoomInEasyDown ZoomInEasyUp ZoomInLeft ZoomInRight
   ZoomInRotate ZoomInUp ZoomOut ZoomOutDown ZoomOutEasyDown ZoomOutEasyUp ZoomOutLeft
   ZoomOutRight ZoomOutRotate ZoomOutUp Layout LinearTransition SequencedTransition
   FadingTransition JumpingTransition CurvedTransition EntryExitTransition`.split(/\s+/)
)

const LAYOUT_ANIMATION_CHAIN_METHODS = new Set([
  'build',
  'duration',
  'delay',
  'getDuration',
  'randomDelay',
  'getDelay',
  'getDelayFunction',
  'easing',
  'rotate',
  'springify',
  'damping',
  'mass',
  'stiffness',
  'overshootClamping',
  'energyThreshold',
  'restDisplacementThreshold',
  'restSpeedThreshold',
  'withInitialValues',
  'getAnimationAndConfig',
  'easingX',
  'easingY',
  'easingWidth',
  'easingHeight',
  'entering',
  'exiting',
  'reverse',
])

function isGestureObject(exp: any): boolean {
  return (
    exp?.type === 'CallExpression' &&
    exp.callee?.type === 'MemberExpression' &&
    exp.callee.object?.type === 'Identifier' &&
    exp.callee.object.name === 'Gesture' &&
    exp.callee.property?.type === 'Identifier' &&
    GESTURE_KINDS.has(exp.callee.property.name)
  )
}

function containsGestureObject(exp: any): boolean {
  if (isGestureObject(exp)) return true
  return (
    exp?.type === 'CallExpression' &&
    exp.callee?.type === 'MemberExpression' &&
    containsGestureObject(exp.callee.object)
  )
}

function isLayoutAnimationChain(exp: any): boolean {
  if (exp?.type === 'Identifier' && LAYOUT_ANIMATIONS.has(exp.name)) return true
  if (
    exp?.type === 'NewExpression' &&
    exp.callee?.type === 'Identifier' &&
    LAYOUT_ANIMATIONS.has(exp.callee.name)
  ) {
    return true
  }
  return (
    exp?.type === 'CallExpression' &&
    exp.callee?.type === 'MemberExpression' &&
    exp.callee.property?.type === 'Identifier' &&
    LAYOUT_ANIMATION_CHAIN_METHODS.has(exp.callee.property.name) &&
    isLayoutAnimationChain(exp.callee.object)
  )
}

// true when every argument of the call should be workletized rather than the
// indices a named hook declares.
function isChainedCallback(callee: any): boolean {
  if (callee?.type !== 'MemberExpression' || callee.property?.type !== 'Identifier') {
    return false
  }
  const name = callee.property.name
  if (GESTURE_BUILDER_METHODS.has(name)) return containsGestureObject(callee.object)
  if (name === 'withCallback') return isLayoutAnimationChain(callee.object)
  return false
}

// the worklets directives, in the order the runtime expects to find them.
export const WORKLET_DIRECTIVES = ['worklet', 'no-worklet-closure', 'limit-init-data-hoisting']

function statementDirective(stmt: any): string | undefined {
  if (!stmt || stmt.type !== 'ExpressionStatement') return undefined
  if (typeof stmt.directive === 'string') return stmt.directive
  if (stmt.expression?.type === 'Literal' && typeof stmt.expression.value === 'string') {
    return stmt.expression.value
  }
  return undefined
}

export function hasDirective(fnNode: any, directive: string): boolean {
  if (!fnNode || !fnNode.body) return false

  // Directives array in Oxc
  if (Array.isArray(fnNode.body.directives)) {
    for (const d of fnNode.body.directives) {
      if (d.directive === directive || d.value === directive) {
        return true
      }
    }
  }

  // leading directive statements in the body
  if (fnNode.body.type === 'BlockStatement' && Array.isArray(fnNode.body.body)) {
    for (const stmt of fnNode.body.body) {
      const found = statementDirective(stmt)
      if (found === undefined) break
      if (found === directive) return true
    }
  }

  return false
}

export function hasWorkletDirective(fnNode: any): boolean {
  return hasDirective(fnNode, 'worklet')
}

/**
 * Source offset just past every leading worklets directive in the body, so a
 * body slice drops all of them rather than only the first. Returns the offset
 * of the first real statement.
 */
export function bodyStartAfterDirectives(fnNode: any, code: string): number {
  let start = fnNode.body.start + 1
  if (fnNode.body.type !== 'BlockStatement' || !Array.isArray(fnNode.body.body)) return start
  for (const stmt of fnNode.body.body) {
    const found = statementDirective(stmt)
    if (found === undefined || !WORKLET_DIRECTIVES.includes(found)) break
    start = stmt.end
    while (start < fnNode.body.end && (code[start] === ';' || /\s/.test(code[start]))) {
      start++
    }
  }
  return start
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
      const chained = !argIndices && isChainedCallback(node.callee)
      const indices =
        argIndices ?? (chained ? node.arguments.map((_: unknown, i: number) => i) : undefined)
      if (indices) {
        for (const idx of indices) {
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
