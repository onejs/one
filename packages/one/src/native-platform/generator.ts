// generator schema and emitter contract for One.ios / One.android.
// the mechanism lives here; sdk catalogs and generated binding content
// belong to the native-domain lane.

export type OneGeneratorNamespace = 'One.ios' | 'One.android'

export type OneGeneratorProvenance = {
  // pinned official input the declaration was generated from
  source: string
  // official symbol path inside that input
  symbol: string
  sdkVersion?: string
}

export type OneParameterSpec = {
  // official parameter label, in official order
  label: string
  name: string
  type: string
  optional?: boolean
}

export type OneDeclarationSpec = {
  namespace: OneGeneratorNamespace
  // official type and member names
  typeName: string
  member: string
  parameters: OneParameterSpec[]
  returns: string
  errors: string[]
  availability: string
  deprecated?: string
  options?: Record<string, unknown>
  result?: Record<string, unknown>
  provenance: OneGeneratorProvenance
}

// only deterministic typescript and bridge representation changes are
// allowed, and each one is recorded here.
export type OneRepresentationChange = {
  kind: 'ts' | 'bridge'
  description: string
  from: string
  to: string
}

export type OneGeneratorSchema = {
  declarations: OneDeclarationSpec[]
  representationChanges: OneRepresentationChange[]
}

function sorted<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

// every required field present, provenance attached, parameter labels
// ordered (order is part of the official signature).
export function validateOneGeneratorSchema(schema: OneGeneratorSchema): void {
  for (const declaration of schema.declarations) {
    if (declaration.namespace !== 'One.ios' && declaration.namespace !== 'One.android') {
      throw new Error(`[one-generator] bad namespace for ${declaration.typeName}`)
    }
    for (const field of ['typeName', 'member', 'returns', 'availability'] as const) {
      if (!declaration[field] || typeof declaration[field] !== 'string') {
        throw new Error(
          `[one-generator] ${declaration.namespace}.${declaration.typeName}.${declaration.member} is missing ${field}`
        )
      }
    }
    if (!declaration.provenance?.source || !declaration.provenance?.symbol) {
      throw new Error(
        `[one-generator] ${declaration.namespace}.${declaration.typeName}.${declaration.member} is missing provenance`
      )
    }
    const labels = declaration.parameters.map((parameter) => parameter.label)
    if (new Set(labels).size !== labels.length && labels.length > 0) {
      throw new Error(
        `[one-generator] ${declaration.namespace}.${declaration.typeName}.${declaration.member} has duplicate parameter labels`
      )
    }
  }
  for (const change of schema.representationChanges) {
    if (change.kind !== 'ts' && change.kind !== 'bridge') {
      throw new Error(`[one-generator] representation change kind must be ts or bridge`)
    }
    if (!change.description || !change.from || !change.to) {
      throw new Error(`[one-generator] representation change must record description, from, and to`)
    }
  }
}

// deterministic emitter: official namespace, type/member names, parameter
// labels and ordering, option/result shapes, errors, availability, and
// deprecation pass through verbatim. output is sorted so regeneration is
// byte-identical.
export function emitOneBinding(schema: OneGeneratorSchema): {
  typescript: string
  native: string
} {
  validateOneGeneratorSchema(schema)
  const declarations = sorted(
    schema.declarations,
    (declaration) => `${declaration.namespace}.${declaration.typeName}.${declaration.member}`
  )
  const typescript = declarations
    .map((declaration) => {
      const parameters = declaration.parameters
        .map((parameter) => {
          if (parameter.label === '_') {
            return `${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type}`
          }
          if (parameter.label === parameter.name) {
            return `${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type}`
          }
          return `${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type} /* label ${parameter.label} */`
        })
        .join(', ')
      const lines = [
        `// ${declaration.namespace}.${declaration.typeName}.${declaration.member}`,
        `// generated from ${declaration.provenance.source}#${declaration.provenance.symbol}`,
        `// availability: ${declaration.availability}`,
        ...(declaration.deprecated ? [`// deprecated: ${declaration.deprecated}`] : []),
        `export namespace ${declaration.namespace === 'One.ios' ? 'ios' : 'android'} {`,
        `  export namespace ${declaration.typeName} {`,
        `    export function ${declaration.member}(${parameters}): ${declaration.returns};`,
        `  }`,
        `}`,
      ]
      return lines.join('\n')
    })
    .join('\n\n')
  const native = stableStringify({
    declarations: declarations.map((declaration) => ({
      namespace: declaration.namespace,
      typeName: declaration.typeName,
      member: declaration.member,
      parameters: declaration.parameters,
      returns: declaration.returns,
      errors: declaration.errors,
      availability: declaration.availability,
      deprecated: declaration.deprecated ?? null,
      options: declaration.options ?? null,
      result: declaration.result ?? null,
      provenance: declaration.provenance,
    })),
    representationChanges: sorted(schema.representationChanges, (change) =>
      stableStringify(change)
    ),
  })
  return {
    typescript: `// generated by one-native-generator. do not edit by hand.\n${typescript}\n`,
    native: `${native}\n`,
  }
}

// byte-identical regeneration gate: a hand rename or signature drift in the
// expected output fails this check.
export function checkOneBindingDeterministic(
  schema: OneGeneratorSchema,
  expected: { typescript: string; native: string }
): void {
  const actual = emitOneBinding(schema)
  if (actual.typescript !== expected.typescript) {
    throw new Error(
      '[one-generator] typescript output drifted: regenerate from the pinned official input instead of editing by hand'
    )
  }
  if (actual.native !== expected.native) {
    throw new Error(
      '[one-generator] native output drifted: regenerate from the pinned official input instead of editing by hand'
    )
  }
}

// official-signature preservation: the candidate must keep namespace, type
// and member names, parameter labels and ordering, option/result shapes,
// errors, availability, and deprecation of the official declaration.
export function verifyAgainstOfficial(
  official: OneDeclarationSpec,
  candidate: OneDeclarationSpec
): void {
  const id = `${official.namespace}.${official.typeName}.${official.member}`
  for (const field of [
    'namespace',
    'typeName',
    'member',
    'returns',
    'availability',
  ] as const) {
    if (candidate[field] !== official[field]) {
      throw new Error(`[one-generator] ${id} drifted: ${field} changed`)
    }
  }
  if ((candidate.deprecated ?? '') !== (official.deprecated ?? '')) {
    throw new Error(`[one-generator] ${id} drifted: deprecation changed`)
  }
  const officialLabels = official.parameters.map((parameter) => parameter.label)
  const candidateLabels = candidate.parameters.map((parameter) => parameter.label)
  if (
    officialLabels.length !== candidateLabels.length ||
    !officialLabels.every((label, index) => label === candidateLabels[index])
  ) {
    throw new Error(`[one-generator] ${id} drifted: parameter labels or ordering changed`)
  }
  const officialTypes = official.parameters.map((parameter) => parameter.type)
  const candidateTypes = candidate.parameters.map((parameter) => parameter.type)
  if (!officialTypes.every((type, index) => type === candidateTypes[index])) {
    throw new Error(`[one-generator] ${id} drifted: parameter types changed`)
  }
  if (stableStringify(candidate.options ?? null) !== stableStringify(official.options ?? null)) {
    throw new Error(`[one-generator] ${id} drifted: option shape changed`)
  }
  if (stableStringify(candidate.result ?? null) !== stableStringify(official.result ?? null)) {
    throw new Error(`[one-generator] ${id} drifted: result shape changed`)
  }
  if (stableStringify(candidate.errors) !== stableStringify(official.errors)) {
    throw new Error(`[one-generator] ${id} drifted: errors changed`)
  }
}
