// generator mechanism for hand-curated One.iOS and One.Android bindings.
// preserves official naming and signatures for selected apis.
// full sdk breadth is explicitly not a gate; the native catalog chooses
// coverage, this module only guarantees fidelity and determinism.

export type RootPlatformNamespace = 'iOS' | 'Android'

export interface OfficialProvenance {
  source: string
  sdkVersion: string
  declarationId: string
}

export interface PlatformParameter {
  // official external label, preserved in order.
  label: string
  name: string
  type: string
  optional?: boolean
}

export interface PlatformDeclaration {
  root: RootPlatformNamespace
  // official framework or package namespace, e.g. UIKit or android.view.
  namespace: string
  typeName: string
  member: string
  parameters: PlatformParameter[]
  returnType: string
  errors: string[]
  availability: Record<string, string>
  deprecated?: string
  provenance: OfficialProvenance
}

export interface RepresentationChange {
  kind: 'typescript-mapping' | 'bridge-mapping'
  field: string
  from: string
  to: string
  reason: string
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
  return `{${entries.join(',')}}`
}

function qualifiedName(declaration: PlatformDeclaration): string {
  return `${declaration.namespace}.${declaration.typeName}.${declaration.member}`
}

function rootQualifier(declaration: PlatformDeclaration): string {
  return `One.${declaration.root}`
}

function validateDeclaration(declaration: PlatformDeclaration): void {
  if (declaration.root !== 'iOS' && declaration.root !== 'Android') {
    throw new Error(`[one] generator root must be One.iOS or One.Android`)
  }
  for (const field of ['namespace', 'typeName', 'member', 'returnType'] as const) {
    if (!declaration[field] || typeof declaration[field] !== 'string') {
      throw new Error(`[one] declaration is missing ${field}`)
    }
  }
  if (!Array.isArray(declaration.parameters) || !Array.isArray(declaration.errors)) {
    throw new Error('[one] declaration parameters and errors must be arrays')
  }
  const labels = new Set<string>()
  for (const parameter of declaration.parameters) {
    if (!parameter.label || !parameter.name || !parameter.type) {
      throw new Error('[one] declaration parameter is missing label, name, or type')
    }
    const key = `${parameter.label}:${parameter.name}`
    if (labels.has(key)) {
      throw new Error(`[one] duplicate parameter "${key}"`)
    }
    labels.add(key)
  }
  if (!declaration.provenance?.declarationId || !declaration.provenance?.sdkVersion) {
    throw new Error('[one] declaration is missing provenance')
  }
}

// deterministic emitter. same declaration plus same recorded changes
// always yields byte-identical output.
export function emitPlatformBinding(
  declaration: PlatformDeclaration,
  changes: RepresentationChange[] = []
): string {
  validateDeclaration(declaration)
  for (const change of changes) {
    if (change.kind !== 'typescript-mapping' && change.kind !== 'bridge-mapping') {
      throw new Error(`[one] unknown representation change "${change.kind}"`)
    }
    if (!change.field || !change.reason) {
      throw new Error('[one] representation change must record field and reason')
    }
  }
  const orderedChanges = [...changes].sort((a, b) =>
    `${a.kind}:${a.field}` < `${b.kind}:${b.field}` ? -1 : 1
  )
  const body = [
    `// generated from ${declaration.provenance.source} ${declaration.provenance.sdkVersion}`,
    `// declaration ${declaration.provenance.declarationId}`,
    `// representation changes ${stableStringify(orderedChanges)}`,
    declaration.deprecated ? `// deprecated: ${declaration.deprecated}` : null,
    `// availability ${stableStringify(declaration.availability)}`,
    `export namespace ${declaration.namespace}_${declaration.typeName} {`,
    `  export type ${declaration.member}Signature = (`,
    ...declaration.parameters.map(
      (parameter) =>
        `    ${parameter.label === '_' ? '' : `/* ${parameter.label} */ `}${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type},`
    ),
    `  ) => ${declaration.returnType};`,
    `}`,
    `export const ${declaration.namespace}_${declaration.typeName}_${declaration.member} = {`,
    `  root: ${JSON.stringify(rootQualifier(declaration))},`,
    `  qualifiedName: ${JSON.stringify(qualifiedName(declaration))},`,
    `  errors: ${stableStringify(declaration.errors)},`,
    `} as const;`,
    ``,
  ]
    .filter((line) => line !== null)
    .join('\n')
  return body
}

// fails when emitted code drifts from the declaration: hand renames,
// reordered or relabeled parameters, reshaped results, or dropped errors.
export function validateBindingMatchesDeclaration(
  emitted: string,
  declaration: PlatformDeclaration
): void {
  validateDeclaration(declaration)
  const expectedQualified = qualifiedName(declaration)
  if (!emitted.includes(`qualifiedName: ${JSON.stringify(expectedQualified)}`)) {
    throw new Error(
      `[one] binding drifts from official name "${expectedQualified}"`
    )
  }
  const expectedRoot = rootQualifier(declaration)
  if (!emitted.includes(`root: ${JSON.stringify(expectedRoot)}`)) {
    throw new Error(`[one] binding must stay under "${expectedRoot}"`)
  }
  for (const parameter of declaration.parameters) {
    if (!emitted.includes(`${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type}`)) {
      throw new Error(
        `[one] binding signature drifts for parameter "${parameter.label}:${parameter.name}"`
      )
    }
  }
  if (!emitted.includes(`) => ${declaration.returnType};`)) {
    throw new Error('[one] binding return type drifts from official signature')
  }
  for (const error of declaration.errors) {
    if (!emitted.includes(error)) {
      throw new Error(`[one] binding drops official error "${error}"`)
    }
  }
  if (
    declaration.deprecated &&
    !emitted.includes(`deprecated: ${declaration.deprecated}`)
  ) {
    throw new Error('[one] binding drops official deprecation')
  }
}

// representative curated declarations. not sdk breadth, only the shape
// the contract must preserve for selected apis.
export const representativeAppleDeclaration: PlatformDeclaration = {
  root: 'iOS',
  namespace: 'UIKit',
  typeName: 'UIView',
  member: 'safeAreaInsets',
  parameters: [],
  returnType: 'UIEdgeInsets',
  errors: [],
  availability: { ios: '11.0' },
  provenance: {
    source: 'apple-sdk',
    sdkVersion: 'pinned',
    declarationId: 'apple-uikit-uiview-safeareainsets',
  },
}

export const representativeAndroidDeclaration: PlatformDeclaration = {
  root: 'Android',
  namespace: 'android.view',
  typeName: 'WindowInsets',
  member: 'getStableInsetTop',
  parameters: [],
  returnType: 'number',
  errors: [],
  availability: { android: '21' },
  provenance: {
    source: 'android-framework',
    sdkVersion: 'pinned',
    declarationId: 'android-view-windowinsets-getstableinsettop',
  },
}
