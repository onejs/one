import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'

/**
 * Hermes does not give a loop a per-iteration binding, for its head OR for
 * anything its body declares. It emits one CreateFunctionEnvironment before the
 * loop, so every closure created in the body captures the same variable and
 * observes its final value:
 *
 *   for (let i = 0; i < 2; i++) fns.push(() => i)
 *   fns.map(f => f())  // [2, 2] on Hermes, [0, 1] everywhere else
 *
 * The body form bites just as hard, and is what breaks react-native's own
 * NativeAnimatedHelper, where every native operation wrapper ends up resolving
 * the last method name in the list:
 *
 *   for (var i = 0; i < 2; i++) { const j = i; fns.push(() => j) }
 *
 * Verified with hermesc -dump-bytecode and on device. Nothing else in the
 * pipeline can lower it: oxc's target floor is es2015 and no target it accepts
 * rewrites loop bindings, and esbuild refuses ("Transforming let to the
 * configured target environment is not supported yet") at every target.
 *
 * A function call is the only construct that gets a fresh environment per
 * invocation, so a loop that captures its binding becomes:
 *
 *   var _loop = (i) => { ...body... }
 *   for (var i = 0; i < 2; i++) _loop(i)
 *
 * Only loops that actually capture their binding in a closure are touched, so
 * this is a no-op for the overwhelming majority of loops.
 */

// only a loop can share a binding this way, and only a lexical declaration can
// be shared, so a module missing either cannot be affected and is never parsed.
const LOOP_RE = /\b(?:for|while)\s*(?:await\s+)?\(/
const LEXICAL_RE = /\b(?:let|const|class)\b/

type Loop = {
  node: any
  names: string[]
}

function langFor(filename: string) {
  const ext = filename.split('?')[0].split('.').pop() || 'js'
  // a .ts file is not tsx (`const f = <T>(x: T) => x` is a type parameter
  // there, an unclosed element under tsx), but everything else is parsed as
  // jsx: react-native ships jsx inside plain .js, and oxc's `js` rejects it.
  if (ext === 'ts' || ext === 'cts' || ext === 'mts') return 'ts' as const
  if (ext === 'tsx') return 'tsx' as const
  return 'jsx' as const
}

function collectPatternNames(node: any, out: string[]) {
  if (!node || typeof node !== 'object') return
  switch (node.type) {
    case 'Identifier':
      out.push(node.name)
      return
    case 'ObjectPattern':
      for (const p of node.properties || []) {
        collectPatternNames(p.value ?? p.argument, out)
      }
      return
    case 'ArrayPattern':
      for (const el of node.elements || []) collectPatternNames(el, out)
      return
    case 'AssignmentPattern':
      collectPatternNames(node.left, out)
      return
    case 'RestElement':
      collectPatternNames(node.argument, out)
      return
  }
}

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
])

function eachChild(node: any, fn: (child: any) => void) {
  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'parent') continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item.type === 'string') fn(item)
      }
    } else if (value && typeof value === 'object' && typeof value.type === 'string') {
      fn(value)
    }
  }
}

/** does any closure inside `body` read one of `names`? */
function capturesInClosure(body: any, names: Set<string>): boolean {
  let found = false

  function scanInsideFunction(node: any, shadowed: Set<string>) {
    if (found || !node || typeof node !== 'object') return
    if (node.type === 'Identifier' && names.has(node.name) && !shadowed.has(node.name)) {
      found = true
      return
    }
    if (FUNCTION_TYPES.has(node.type)) {
      const inner = new Set(shadowed)
      const params: string[] = []
      for (const p of node.params || []) collectPatternNames(p, params)
      for (const p of params) inner.add(p)
      if (node.id?.name) inner.add(node.id.name)
      eachChild(node, (c) => scanInsideFunction(c, inner))
      return
    }
    // a member expression's property is not a reference to the binding
    if (node.type === 'MemberExpression' && !node.computed) {
      scanInsideFunction(node.object, shadowed)
      return
    }
    if (node.type === 'Property' && !node.computed && node.key === node.value) {
      // shorthand `{ i }` still reads i
      scanInsideFunction(node.value, shadowed)
      return
    }
    eachChild(node, (c) => scanInsideFunction(c, shadowed))
  }

  function walk(node: any) {
    if (found || !node || typeof node !== 'object') return
    if (FUNCTION_TYPES.has(node.type)) {
      const shadowed = new Set<string>()
      const params: string[] = []
      for (const p of node.params || []) collectPatternNames(p, params)
      for (const p of params) shadowed.add(p)
      eachChild(node, (c) => scanInsideFunction(c, shadowed))
      return
    }
    eachChild(node, walk)
  }

  walk(body)
  return found
}

type BodyFacts = {
  hasBreak: boolean
  hasContinue: boolean
  hasReturn: boolean
  hasAwait: boolean
  hasYield: boolean
  assignsBinding: boolean
  hasLabeledJump: boolean
}

/**
 * Control flow that has to survive being moved into a function body. `break`
 * and `continue` are only relevant when they belong to THIS loop, so nested
 * loops and switches are not descended into for those.
 */
function analyzeBody(body: any, names: Set<string>): BodyFacts {
  const facts: BodyFacts = {
    hasBreak: false,
    hasContinue: false,
    hasReturn: false,
    hasAwait: false,
    hasYield: false,
    assignsBinding: false,
    hasLabeledJump: false,
  }

  function walk(node: any, inNestedBreakable: boolean, inNestedLoop: boolean, inFunction: boolean) {
    if (!node || typeof node !== 'object') return

    if (FUNCTION_TYPES.has(node.type)) {
      eachChild(node, (c) => walk(c, inNestedBreakable, inNestedLoop, true))
      return
    }

    switch (node.type) {
      case 'BreakStatement':
        if (node.label) facts.hasLabeledJump = true
        else if (!inNestedBreakable) facts.hasBreak = true
        break
      case 'ContinueStatement':
        if (node.label) facts.hasLabeledJump = true
        else if (!inNestedLoop) facts.hasContinue = true
        break
      case 'ReturnStatement':
        if (!inFunction) facts.hasReturn = true
        break
      case 'AwaitExpression':
        if (!inFunction) facts.hasAwait = true
        break
      case 'YieldExpression':
        if (!inFunction) facts.hasYield = true
        break
      case 'AssignmentExpression':
        if (node.left?.type === 'Identifier' && names.has(node.left.name)) {
          facts.assignsBinding = true
        }
        break
      case 'UpdateExpression':
        if (node.argument?.type === 'Identifier' && names.has(node.argument.name)) {
          facts.assignsBinding = true
        }
        break
    }

    const isLoop =
      node.type === 'ForStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    const isBreakable = isLoop || node.type === 'SwitchStatement'

    eachChild(node, (c) =>
      walk(c, inNestedBreakable || isBreakable, inNestedLoop || isLoop, inFunction)
    )
  }

  walk(body, false, false, false)
  return facts
}

/**
 * Lexical names the body itself declares. Nested functions are skipped, since
 * their declarations already get a fresh environment per call, but nested
 * blocks and nested loop heads are not: Hermes gives the whole loop one
 * environment, so anything declared anywhere under it is shared too.
 */
function collectBodyLexicalNames(node: any, out: string[]) {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return
  if (FUNCTION_TYPES.has(node.type) || node.type === 'ClassBody') return
  if (node.type === 'VariableDeclaration') {
    if (node.kind === 'let' || node.kind === 'const') {
      for (const d of node.declarations || []) collectPatternNames(d.id, out)
    }
    return
  }
  if (node.type === 'ClassDeclaration') {
    if (node.id?.name) out.push(node.id.name)
    return
  }
  eachChild(node, (c) => collectBodyLexicalNames(c, out))
}

const LOOP_TYPES = new Set([
  'ForStatement',
  'ForOfStatement',
  'ForInStatement',
  'WhileStatement',
  'DoWhileStatement',
])

function headDeclaration(node: any): any {
  if (node.type === 'ForStatement') return node.init
  if (node.type === 'ForOfStatement' || node.type === 'ForInStatement') return node.left
  return null
}

/**
 * One pass. Only the outermost qualifying loop of a nested chain is rewritten,
 * because rewriting an inner loop whose text is about to be moved would produce
 * overlapping edits. The caller re-runs until the code stops changing, which
 * picks up inner loops on later passes.
 */
function transformOnce(
  code: string,
  filename: string
): { code: string; map: any } | null {
  const parsed = parseSync(filename, code, { lang: langFor(filename) })
  if (!parsed?.program || parsed.errors?.length) return null

  const candidates: Loop[] = []

  function findLoops(node: any, insideCandidate: boolean) {
    if (!node || typeof node !== 'object') return

    let isCandidate = false
    if (LOOP_TYPES.has(node.type) && node.body) {
      // only head names become parameters of the lifted function; body
      // declarations are made fresh just by moving into a function body.
      const names: string[] = []
      const decl = headDeclaration(node)
      if (decl?.type === 'VariableDeclaration' && (decl.kind === 'let' || decl.kind === 'const')) {
        for (const d of decl.declarations || []) collectPatternNames(d.id, names)
      }
      const shared = [...names]
      collectBodyLexicalNames(node.body, shared)
      if (shared.length && capturesInClosure(node.body, new Set(shared))) {
        isCandidate = true
        if (!insideCandidate) candidates.push({ node, names })
      }
    }

    eachChild(node, (c) => findLoops(c, insideCandidate || isCandidate))
  }

  findLoops(parsed.program, false)
  if (!candidates.length) return null

  const s = new MagicString(code)
  let counter = 0
  let changed = false

  for (const { node, names } of candidates) {
    const nameSet = new Set(names)
    const facts = analyzeBody(node.body, nameSet)

    // a generator body cannot be lifted into a plain function, and reassigning
    // the loop binding inside the body would strand the update in the callee.
    // both are rare and left alone rather than rewritten incorrectly.
    if (facts.hasYield || facts.assignsBinding || facts.hasLabeledJump) continue

    // the head declaration is left exactly as written. lowering it to `var`
    // hoists it out of the loop, where it collides with any sibling `const` of
    // the same name (react-native-gesture-handler's Pressable declares `const
    // gesture` right after a `for (const gesture of gestures)`).
    const fnName = `_hermesLoop${counter++}`
    const params = names.join(', ')

    let bodyText = code.slice(node.body.start, node.body.end)
    if (node.body.type !== 'BlockStatement') {
      bodyText = `{ ${bodyText} }`
    }

    if (facts.hasBreak || facts.hasReturn || facts.hasContinue) {
      bodyText = rewriteJumps(bodyText, node.body, code, nameSet)
    }

    const asyncKw = facts.hasAwait ? 'async ' : ''
    const awaitKw = facts.hasAwait ? 'await ' : ''

    let call = `${awaitKw}${fnName}(${params})`
    if (facts.hasBreak || facts.hasReturn) {
      const checks: string[] = []
      if (facts.hasBreak) checks.push('if (_r === 1) break;')
      if (facts.hasReturn) checks.push('if (_r) return _r.v;')
      call = `{ var _r = ${call}; ${checks.join(' ')} }`
    } else {
      call = `{ ${call}; }`
    }

    s.overwrite(node.body.start, node.body.end, call)
    // an arrow, so `this`, `arguments`, `new.target` and `super` inside the body
    // still mean what they meant in the function that contained the loop.
    // keep the declaration and loop together when the parent takes one statement.
    s.appendLeft(node.start, `{\nvar ${fnName} = ${asyncKw}(${params}) => ${bodyText};\n`)
    s.appendLeft(node.end, '\n}')
    changed = true
  }

  if (!changed) return null
  return {
    code: s.toString(),
    map: s.generateMap({ hires: true, source: filename, includeContent: false }),
  }
}

/**
 * `break` leaves the loop and `return` leaves the enclosing function, but once
 * the body is a function neither reaches its original target. They become
 * return values the call site acts on: 1 for break, {v} for return. A normal
 * completion and a `continue` both return undefined, which is exactly right,
 * since falling out of _loop continues the loop.
 */
function rewriteJumps(bodyText: string, bodyNode: any, code: string, names: Set<string>): string {
  const offset = bodyNode.start
  const s = new MagicString(bodyText)
  const pad = bodyNode.type === 'BlockStatement' ? 0 : 2

  function walk(node: any, inNestedBreakable: boolean, inNestedLoop: boolean, inFunction: boolean) {
    if (!node || typeof node !== 'object') return

    if (FUNCTION_TYPES.has(node.type)) {
      eachChild(node, (c) => walk(c, inNestedBreakable, inNestedLoop, true))
      return
    }

    if (node.type === 'BreakStatement' && !node.label && !inNestedBreakable) {
      s.overwrite(node.start - offset + pad, node.end - offset + pad, 'return 1;')
      return
    }
    if (node.type === 'ContinueStatement' && !node.label && !inNestedLoop) {
      s.overwrite(node.start - offset + pad, node.end - offset + pad, 'return;')
      return
    }
    if (node.type === 'ReturnStatement' && !inFunction) {
      const arg = node.argument
      const replacement = arg
        ? `return { v: ${code.slice(arg.start, arg.end)} };`
        : 'return { v: undefined };'
      s.overwrite(node.start - offset + pad, node.end - offset + pad, replacement)
      return
    }

    const isLoop =
      node.type === 'ForStatement' ||
      node.type === 'ForOfStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'WhileStatement' ||
      node.type === 'DoWhileStatement'
    const isBreakable = isLoop || node.type === 'SwitchStatement'

    eachChild(node, (c) =>
      walk(c, inNestedBreakable || isBreakable, inNestedLoop || isLoop, inFunction)
    )
  }

  walk(bodyNode, false, false, false)
  return s.toString()
}

export function transformHermesLoops(
  code: string,
  filename: string
): { code: string; maps: any[] } | null {
  if (!LOOP_RE.test(code) || !LEXICAL_RE.test(code)) return null

  let current = code
  const maps: any[] = []
  // each pass rewrites the outermost qualifying loops; nested ones surface on
  // the next pass once the enclosing body has been lifted. every pass emits its
  // own map so the caller can chain them and keep symbolication accurate.
  for (let i = 0; i < 10; i++) {
    const next = transformOnce(current, filename)
    if (!next) break
    current = next.code
    maps.push(next.map)
  }

  return maps.length ? { code: current, maps } : null
}
