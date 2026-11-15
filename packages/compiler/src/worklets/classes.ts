import type { WorkletClassCandidate } from './types'

export const WORKLET_CLASS_MARKER = '__workletClass'
export const WORKLET_CLASS_FACTORY_SUFFIX = '__classFactory'

const MARKER_FIELD_TYPES = new Set([
  'PropertyDefinition',
  'AccessorProperty',
  'TSAbstractPropertyDefinition',
])

function isMarkerField(element: any): boolean {
  return (
    MARKER_FIELD_TYPES.has(element?.type) &&
    !element.computed &&
    element.key?.type === 'Identifier' &&
    element.key.name === WORKLET_CLASS_MARKER
  )
}

export function findWorkletClasses(program: any): WorkletClassCandidate[] {
  const candidates: WorkletClassCandidate[] = []

  function walk(node: any, parent: any) {
    if (!node || typeof node !== 'object') return

    if (
      node.type === 'ClassDeclaration' &&
      node.id?.type === 'Identifier' &&
      !node.declare &&
      // class-level decorators sit outside the class range upstream's factory
      // shape can carry, so decorated classes keep today's raw capture.
      !(node.decorators?.length > 0)
    ) {
      const marker = node.body?.body?.find(isMarkerField)
      if (marker) {
        candidates.push({ node, name: node.id.name, parent, marker })
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) walk(item, node)
      } else if (child && typeof child === 'object') {
        walk(child, node)
      }
    }
  }

  walk(program, null)
  // a marked class nested inside another marked class shares one rewrite
  // range with it, so only the outermost of an overlap is rewritten.
  return candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) =>
          other !== candidate &&
          other.node.start <= candidate.node.start &&
          other.node.end >= candidate.node.end
      )
  )
}

export function classFactoryName(className: string): string {
  return `${className}${WORKLET_CLASS_FACTORY_SUFFIX}`
}

function collectPatternNames(pattern: any, count: (name: string) => void) {
  if (!pattern || typeof pattern !== 'object') return
  switch (pattern.type) {
    case 'Identifier':
      count(pattern.name)
      return
    case 'AssignmentPattern':
      collectPatternNames(pattern.left, count)
      return
    case 'RestElement':
      collectPatternNames(pattern.argument, count)
      return
    case 'ArrayPattern':
      for (const element of pattern.elements ?? []) collectPatternNames(element, count)
      return
    case 'ObjectPattern':
      for (const property of pattern.properties ?? []) {
        if (property?.type === 'Property') collectPatternNames(property.value, count)
        else if (property?.type === 'RestElement')
          collectPatternNames(property.argument, count)
      }
      return
    case 'TSParameterProperty':
      collectPatternNames(pattern.parameter, count)
      return
  }
}

/**
 * marked class names that are the sole value binding of that name in the file.
 * every free reference to one necessarily resolves to the marked class, so a
 * worklet capturing it (a superclass, a static access, an instanceof) carries
 * the factory instead of the raw class. any other binding of the same name
 * keeps the previous capture, since the reference may resolve to that one.
 */
export function findUnambiguousClassNames(
  program: any,
  candidates: WorkletClassCandidate[]
): Set<string> {
  const wanted = new Set(candidates.map((candidate) => candidate.name))
  const counts = new Map<string, number>()
  const count = (name: string) => {
    if (wanted.has(name)) counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  function walk(node: any) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    switch (node.type) {
      case 'VariableDeclarator':
        collectPatternNames(node.id, count)
        break
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        if (node.id?.type === 'Identifier') count(node.id.name)
        for (const param of node.params ?? []) collectPatternNames(param, count)
        break
      case 'ArrowFunctionExpression':
        for (const param of node.params ?? []) collectPatternNames(param, count)
        break
      case 'ClassDeclaration':
      case 'ClassExpression':
        if (node.id?.type === 'Identifier') count(node.id.name)
        break
      case 'CatchClause':
        collectPatternNames(node.param, count)
        break
      case 'ImportSpecifier':
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
        if (node.local?.type === 'Identifier') count(node.local.name)
        break
      case 'TSEnumDeclaration':
      case 'TSModuleDeclaration':
        if (node.id?.type === 'Identifier') count(node.id.name)
        break
    }
    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue
      walk(node[key])
    }
  }

  walk(program)
  return new Set(
    candidates.filter((candidate) => counts.get(candidate.name) === 1).map((c) => c.name)
  )
}

const ABSTRACT_MEMBER_TYPES = new Set([
  'TSAbstractMethodDefinition',
  'TSAbstractPropertyDefinition',
])

export function buildClassFactoryDeclaration(
  candidate: WorkletClassCandidate,
  code: string
): string {
  const { node, name, marker } = candidate
  const factory = classFactoryName(name)

  // the marker plus any bodiless abstract member, which only compiles inside
  // an abstract class declaration and a factory holds a class expression.
  const removals: Array<[number, number]> = [
    [marker.decorators?.[0]?.start ?? marker.start, marker.end],
  ]
  for (const element of node.body?.body ?? []) {
    if (ABSTRACT_MEMBER_TYPES.has(element?.type)) {
      removals.push([element.start, element.end])
    }
  }
  removals.sort((a, b) => a[0] - b[0])
  let classSrc = ''
  let cursor = node.start
  for (const [start, end] of removals) {
    if (start < cursor) continue
    classSrc += code.slice(cursor, start)
    cursor = end
  }
  classSrc += code.slice(cursor, node.end)
  const classExpr = classSrc.replace(/^abstract\s+/, '')

  return [
    `function ${factory}() {`,
    `'worklet';`,
    `const ${name} = ${classExpr};`,
    `${name}.${factory} = ${factory};`,
    `return ${name};`,
    `}`,
  ].join('\n')
}

/**
 * names constructed with `new Name()` anywhere under the worklet, in traversal
 * order. like upstream's plugin, callers rewrite one whose name is also a
 * captured variable to its class factory, without checking where the class
 * was defined, so imported worklet classes resolve through their own file.
 */
export function findConstructedNames(fnNode: any): string[] {
  const names: string[] = []
  const seen = new Set<string>()

  function walk(node: any) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (
      node.type === 'NewExpression' &&
      node.callee?.type === 'Identifier' &&
      !seen.has(node.callee.name)
    ) {
      seen.add(node.callee.name)
      names.push(node.callee.name)
    }
    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue
      walk(node[key])
    }
  }

  walk(fnNode.body)
  for (const param of fnNode.params ?? []) walk(param)
  return names
}
