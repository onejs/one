/**
 * View-config generation for react-native component specs, without babel.
 *
 * `@react-native/codegen` builds a full CodegenSchema with @babel/parser and
 * emits the module with @babel/generator, which is the last thing in the native
 * pipeline that runs babel at all: 11,774 babel calls per bundle of the soot
 * app, every one of them from codegen. The view config itself is a plain object
 * literal, so it can be read off the spec's own AST and printed as text.
 *
 * Only what a view config needs is modeled here: the prop list in declaration
 * order, the five prop types that get a custom attribute descriptor, the two
 * event handler shapes, and the command list. Everything else about a prop's
 * type is irrelevant to the runtime, which is why the generated `validAttributes`
 * is almost entirely `true`.
 *
 * TypeScript specs are parsed with oxc. React Native's own specs are Flow, which
 * oxc cannot parse, so those go through hermes-parser (which is not babel).
 */

import { createRequire } from 'node:module'
import { basename, join } from 'node:path'
import { parseSync } from 'oxc-parser'

const SELF_URL: string = typeof __filename !== 'undefined' ? __filename : import.meta.url

/** attribute descriptors react-native needs for props it cannot diff by identity */
const COLOR_ATTRIBUTE =
  "require('react-native/Libraries/Components/View/ReactNativeStyleAttributes').colorAttribute"
const COLOR_ARRAY_ATTRIBUTE =
  "{\n      process: (req => 'default' in req ? req.default : req)(require('react-native/Libraries/StyleSheet/processColorArray'))\n    }"
const IMAGE_ATTRIBUTE =
  "{\n      process: (req => 'default' in req ? req.default : req)(require('react-native/Libraries/Image/resolveAssetSource'))\n    }"
const POINT_ATTRIBUTE =
  "{\n      diff: (req => 'default' in req ? req.default : req)(require('react-native/Libraries/Utilities/differ/pointsDiffer'))\n    }"
const EDGE_INSETS_ATTRIBUTE =
  "{\n      diff: (req => 'default' in req ? req.default : req)(require('react-native/Libraries/Utilities/differ/insetsDiffer'))\n    }"

const IMPORT_REGISTRY =
  "const NativeComponentRegistry = require('react-native/Libraries/NativeComponent/NativeComponentRegistry');"
const IMPORT_IGNORE =
  "const {ConditionallyIgnoredEventHandlers} = require('react-native/Libraries/NativeComponent/ViewConfigIgnore');"
const IMPORT_DISPATCH =
  'const {dispatchCommand} = require("react-native/Libraries/ReactNative/RendererProxy");'
const IMPORT_UIMANAGER = 'const {UIManager} = require("react-native")'

type Attribute = { name: string; value: string }
type EventProp = { name: string; bubbling: boolean; topName: string }
type Command = { name: string; params: string[] }

/** a prop or event read off the spec, before it becomes view-config text */
type Member = { name: string; type: TypeRef }

/** a type annotation reduced to the only two things that matter here */
type TypeRef = { name: string; args: TypeRef[] }

let hermesParser: any = undefined

function getHermesParser(projectRoot?: string) {
  if (hermesParser === undefined) {
    try {
      const req = projectRoot
        ? createRequire(join(projectRoot, 'package.json'))
        : createRequire(SELF_URL)
      hermesParser = req('hermes-parser')
    } catch {
      try {
        hermesParser = createRequire(SELF_URL)('hermes-parser')
      } catch {
        hermesParser = null
      }
    }
  }
  return hermesParser
}

// ---------------------------------------------------------------------------
// type annotations
// ---------------------------------------------------------------------------

/**
 * Both dialects reduce to a name plus type arguments. Wrappers that do not
 * change what the runtime does with a prop are unwrapped here rather than
 * modeled: a nullable color is still a color.
 */
function readType(node: any): TypeRef {
  if (!node) return { name: '', args: [] }

  switch (node.type) {
    // flow
    case 'NullableTypeAnnotation':
    case 'TypeAnnotation':
      return readType(node.typeAnnotation)
    case 'GenericTypeAnnotation':
      return {
        name: readTypeName(node.id),
        args: (node.typeParameters?.params ?? []).map(readType),
      }
    case 'ObjectTypeAnnotation':
      return { name: '__object', args: [] }
    case 'StringTypeAnnotation':
      return { name: 'string', args: [] }
    case 'BooleanTypeAnnotation':
      return { name: 'boolean', args: [] }
    case 'NumberTypeAnnotation':
      return { name: 'number', args: [] }
    case 'UnionTypeAnnotation':
      return readUnion(node)
    case 'FunctionTypeAnnotation':
      return { name: '__function', args: [] }

    // typescript
    case 'TSTypeAnnotation':
      return readType(node.typeAnnotation)
    case 'TSTypeReference':
      return {
        name: readTypeName(node.typeName),
        args: (node.typeArguments ?? node.typeParameters)?.params?.map(readType) ?? [],
      }
    case 'TSTypeLiteral':
      return { name: '__object', args: [] }
    case 'TSStringKeyword':
      return { name: 'string', args: [] }
    case 'TSBooleanKeyword':
      return { name: 'boolean', args: [] }
    case 'TSNumberKeyword':
      return { name: 'number', args: [] }
    case 'TSUnionType':
      return readUnion(node)
    case 'TSFunctionType':
      return { name: '__function', args: [] }
    case 'TSArrayType':
      return { name: 'Array', args: [readType(node.elementType)] }
  }

  return { name: '__unknown', args: [] }
}

const NULLISH_TYPES = new Set([
  'TSUndefinedKeyword',
  'TSNullKeyword',
  'TSVoidKeyword',
  'NullLiteralTypeAnnotation',
  'VoidTypeAnnotation',
])

/**
 * `DirectEventHandler<E> | undefined` is the same prop as `DirectEventHandler<E>`.
 * A union of anything else is an enum or a mixed type, which the runtime diffs
 * by identity either way.
 */
function readUnion(node: any): TypeRef {
  const real = (node.types ?? []).filter((t: any) => !NULLISH_TYPES.has(t.type))
  if (real.length === 1) return readType(real[0])
  return { name: '__union', args: [] }
}

function readTypeName(id: any): string {
  if (!id) return ''
  if (id.type === 'Identifier') return id.name
  // Qualified names (`Foo.Bar`) only appear on types the runtime treats as
  // opaque, so the last segment is enough to classify them.
  if (id.type === 'QualifiedTypeIdentifier') return readTypeName(id.id)
  if (id.type === 'TSQualifiedName') return readTypeName(id.right)
  return ''
}

const READONLY_ARRAYS = new Set(['ReadonlyArray', '$ReadOnlyArray', 'Array'])

/** wrappers that carry no runtime meaning for a view config */
const TRANSPARENT = new Set(['WithDefault', 'UnsafeMixed', 'Readonly', '$ReadOnly'])

function unwrap(type: TypeRef): TypeRef {
  let cur = type
  while (TRANSPARENT.has(cur.name) && cur.args.length > 0) {
    cur = cur.args[0]
  }
  return cur
}

function attributeValue(type: TypeRef): string {
  const t = unwrap(type)
  switch (t.name) {
    case 'ColorValue':
    case 'ProcessedColorValue':
      return COLOR_ATTRIBUTE
    case 'ImageSource':
      return IMAGE_ATTRIBUTE
    case 'PointValue':
      return POINT_ATTRIBUTE
    case 'EdgeInsetsValue':
      return EDGE_INSETS_ATTRIBUTE
  }
  if (READONLY_ARRAYS.has(t.name) && t.args.length === 1) {
    const el = unwrap(t.args[0])
    if (el.name === 'ColorValue' || el.name === 'ProcessedColorValue') {
      return COLOR_ARRAY_ATTRIBUTE
    }
  }
  return 'true'
}

function eventOf(name: string, type: TypeRef): EventProp | null {
  const t = unwrap(type)
  if (t.name !== 'DirectEventHandler' && t.name !== 'BubblingEventHandler') return null
  // the second type argument is the deprecated paper-level event name, which
  // renames the top-level event but never the registration name
  const override = t.args[1]?.name
  return {
    name,
    bubbling: t.name === 'BubblingEventHandler',
    topName: normalizeInputEventName(
      override && override !== '__unknown' ? override : name
    ),
  }
}

function normalizeInputEventName(name: string) {
  if (name.startsWith('on')) return name.replace(/^on/, 'top')
  if (!name.startsWith('top')) return `top${name[0].toUpperCase()}${name.slice(1)}`
  return name
}

// ---------------------------------------------------------------------------
// reading the spec
// ---------------------------------------------------------------------------

type Declarations = Map<string, any>

function collectDeclarations(body: any[]): Declarations {
  const out: Declarations = new Map()
  for (const raw of body) {
    const node = raw?.type === 'ExportNamedDeclaration' ? raw.declaration : raw
    if (!node) continue
    switch (node.type) {
      case 'TSTypeAliasDeclaration':
      case 'TypeAlias':
      case 'TSInterfaceDeclaration':
      case 'InterfaceDeclaration':
        if (node.id?.name) out.set(node.id.name, node)
        break
    }
  }
  return out
}

/**
 * The members a props type contributes, in the order react-native's own codegen
 * emits them: everything it extends first, in declaration order, then its own.
 * `ViewProps` is the core view's props, which the runtime supplies itself.
 */
function flattenMembers(
  typeName: string,
  decls: Declarations,
  seen = new Set<string>()
): Member[] {
  if (typeName === 'ViewProps' || seen.has(typeName)) return []
  seen.add(typeName)

  const decl = decls.get(typeName)
  if (!decl) return []

  const out: Member[] = []

  const heritage = decl.extends ?? decl.heritage ?? []
  for (const h of heritage) {
    const name = readTypeName(h.id ?? h.expression ?? h.typeName)
    if (name) out.push(...flattenMembers(name, decls, seen))
  }

  const bodyNode =
    decl.body ?? // interface
    decl.right ?? // type alias
    decl.typeAnnotation
  out.push(...readObjectMembers(bodyNode, decls, seen))

  return out
}

function readObjectMembers(node: any, decls: Declarations, seen: Set<string>): Member[] {
  if (!node) return []

  // `Readonly<{...}>` / `$ReadOnly<{...}>` around the real shape
  if (node.type === 'TSTypeReference' || node.type === 'GenericTypeAnnotation') {
    const name = readTypeName(node.typeName ?? node.id)
    const args = (node.typeArguments ?? node.typeParameters)?.params ?? []
    if (TRANSPARENT.has(name) && args.length) {
      return readObjectMembers(args[0], decls, seen)
    }
    // an alias of another props type
    return flattenMembers(name, decls, seen)
  }

  if (node.type === 'TSIntersectionType' || node.type === 'IntersectionTypeAnnotation') {
    const out: Member[] = []
    for (const t of node.types ?? []) out.push(...readObjectMembers(t, decls, seen))
    return out
  }

  const members = node.members ?? node.body ?? node.properties ?? []
  const out: Member[] = []
  for (const m of members) {
    switch (m.type) {
      case 'TSPropertySignature':
      case 'ObjectTypeProperty': {
        const name = m.key?.name ?? m.key?.value
        if (!name) break
        out.push({ name, type: readType(m.typeAnnotation ?? m.value) })
        break
      }
      // flow's `...OtherProps` inside an object type
      case 'ObjectTypeSpreadProperty': {
        const name = readTypeName(m.argument?.id ?? m.argument)
        if (name) out.push(...flattenMembers(name, decls, seen))
        break
      }
    }
  }
  return out
}

function findComponentCall(body: any[]): any {
  for (const node of body) {
    if (node.type !== 'ExportDefaultDeclaration') continue
    let expr = node.declaration
    while (expr) {
      if (expr.type === 'CallExpression') break
      expr =
        expr.expression ??
        (expr.type === 'SequenceExpression'
          ? expr.expressions[expr.expressions.length - 1]
          : null)
    }
    if (
      expr?.type === 'CallExpression' &&
      expr.callee?.name === 'codegenNativeComponent'
    ) {
      return expr
    }
  }
  return null
}

function findCommandsCall(body: any[]): any {
  for (const raw of body) {
    const node = raw?.type === 'ExportNamedDeclaration' ? raw.declaration : raw
    const decl = node?.declarations?.[0]
    let init = decl?.init
    while (init && init.type !== 'CallExpression') init = init.expression
    if (
      init?.type === 'CallExpression' &&
      init.callee?.name === 'codegenNativeCommands'
    ) {
      return init
    }
  }
  return null
}

function readStringOption(objectExpression: any, key: string): string | null {
  for (const p of objectExpression?.properties ?? []) {
    if ((p.key?.name ?? p.key?.value) === key && typeof p.value?.value === 'string') {
      return p.value.value
    }
  }
  return null
}

function readCommands(call: any, decls: Declarations): Command[] {
  const typeName = readTypeName(
    (call.typeArguments ?? call.typeParameters)?.params?.[0]?.typeName ??
      (call.typeArguments ?? call.typeParameters)?.params?.[0]?.id
  )
  const supported: string[] = []
  for (const p of call.arguments?.[0]?.properties ?? []) {
    if ((p.key?.name ?? p.key?.value) !== 'supportedCommands') continue
    for (const el of p.value?.elements ?? []) {
      if (typeof el?.value === 'string') supported.push(el.value)
    }
  }
  if (!supported.length) return []

  // parameter names come from the commands interface; the first parameter is
  // the view ref, which the generated method takes but never forwards
  const decl = decls.get(typeName)
  const byName = new Map<string, string[]>()
  // a TS interface body holds `.body`; flow's is an object type with `.properties`
  const commandMembers =
    decl?.body?.body ?? decl?.body?.members ?? decl?.body?.properties ?? []
  for (const m of commandMembers) {
    const name = m.key?.name ?? m.key?.value
    if (!name) continue
    const fn = m.typeAnnotation?.typeAnnotation ?? m.value ?? m.typeAnnotation
    const params = (fn?.params ?? fn?.parameters ?? []).slice(1)
    byName.set(
      name,
      params.map((p: any, i: number) => p.name?.name ?? p.name ?? `arg${i}`)
    )
  }

  return supported.map((name) => ({ name, params: byName.get(name) ?? [] }))
}

// ---------------------------------------------------------------------------
// printing
// ---------------------------------------------------------------------------

function indent(text: string, spaces: number) {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line, i) => (i === 0 || line === '' ? line : pad + line))
    .join('\n')
}

function printViewConfig(
  componentName: string,
  attributes: Attribute[],
  events: EventProp[]
): string {
  const lines: string[] = [`  uiViewClassName: ${JSON.stringify(componentName)}`]

  const bubbling = events.filter((e) => e.bubbling)
  if (bubbling.length) {
    lines.push(
      `  bubblingEventTypes: {\n${bubbling
        .map(
          (e) =>
            `    ${e.topName}: {\n      phasedRegistrationNames: {\n        captured: ${JSON.stringify(
              `${e.name}Capture`
            )},\n        bubbled: ${JSON.stringify(e.name)}\n      }\n    }`
        )
        .join(',\n')}\n  }`
    )
  }

  const direct = events.filter((e) => !e.bubbling)
  if (direct.length) {
    lines.push(
      `  directEventTypes: {\n${direct
        .map(
          (e) =>
            `    ${e.topName}: {\n      registrationName: ${JSON.stringify(e.name)}\n    }`
        )
        .join(',\n')}\n  }`
    )
  }

  const attrLines = attributes.map((a) => `    ${a.name}: ${indent(a.value, 4)}`)
  if (events.length) {
    attrLines.push(
      `    ...ConditionallyIgnoredEventHandlers({\n${events
        .map((e) => `      ${e.name}: true`)
        .join(',\n')}\n    })`
    )
  }
  lines.push(
    attrLines.length
      ? `  validAttributes: {\n${attrLines.join(',\n')}\n  }`
      : '  validAttributes: {}'
  )

  return `{\n${lines.join(',\n')}\n}`
}

function printCommands(commands: Command[]): string {
  return `export const Commands = {\n${commands
    .map(
      (c) =>
        `  ${c.name}(ref${c.params.map((p) => `, ${p}`).join('')}) {\n    dispatchCommand(ref, ${JSON.stringify(
          c.name
        )}, [${c.params.join(', ')}]);\n  }`
    )
    .join(',\n')}\n};`
}

const FILE_HEADER = `/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * @flow
 *
 * @generated by codegen project: GenerateViewConfigJs.js
 */

'use strict';
`

// ---------------------------------------------------------------------------
// entry
// ---------------------------------------------------------------------------

export function parseSpec(code: string, filename: string, projectRoot?: string): any {
  const isTS = /\.[cm]?tsx?$/.test(filename)
  if (isTS) {
    const result = parseSync(filename, code, {
      lang: filename.endsWith('x') ? 'tsx' : 'ts',
    })
    if (result.errors?.length) return null
    return result.program
  }

  const hermes = getHermesParser(projectRoot)
  if (!hermes) return null
  try {
    // `babel: false` keeps this on hermes' own ESTree output, which is what
    // makes this path babel-free.
    return hermes.parse(code, {
      babel: false,
      flow: 'all',
      sourceFilename: filename,
    }) as any
  } catch {
    return null
  }
}

/**
 * Generate the replacement for a spec's default export, plus the `Commands`
 * export when the spec declares one. Returns null when the file is not a spec
 * this can handle, so the caller can leave it alone.
 */
export function generateViewConfig(
  program: any
): { imports: string[]; body: string } | null {
  const body = program?.body
  if (!body) return null

  const call = findComponentCall(body)
  if (!call) return null

  const componentNameArg = call.arguments?.[0]
  if (typeof componentNameArg?.value !== 'string') return null
  const componentName = componentNameArg.value

  const options = call.arguments?.[1]
  const paperComponentName = readStringOption(options, 'paperComponentName')
  const paperComponentNameDeprecated = readStringOption(
    options,
    'paperComponentNameDeprecated'
  )

  const propsTypeName = readTypeName(
    (call.typeArguments ?? call.typeParameters)?.params?.[0]?.typeName ??
      (call.typeArguments ?? call.typeParameters)?.params?.[0]?.id
  )
  if (!propsTypeName) return null

  const decls = collectDeclarations(body)
  const members = flattenMembers(propsTypeName, decls)

  const attributes: Attribute[] = []
  const events: EventProp[] = []
  for (const m of members) {
    const event = eventOf(m.name, m.type)
    if (event) {
      events.push(event)
      continue
    }
    attributes.push({ name: m.name, value: attributeValue(m.type) })
  }

  const commandsCall = findCommandsCall(body)
  const commands = commandsCall ? readCommands(commandsCall, decls) : []

  const imports = new Set([IMPORT_REGISTRY])
  if (events.length) imports.add(IMPORT_IGNORE)
  if (commands.length) imports.add(IMPORT_DISPATCH)
  if (paperComponentNameDeprecated) imports.add(IMPORT_UIMANAGER)

  const nativeName = paperComponentName ?? componentName
  const parts: string[] = [`let nativeComponentName = '${nativeName}';`]

  if (paperComponentNameDeprecated) {
    parts.push(
      `if (UIManager.hasViewManagerConfig('${componentName}')) {\n` +
        `  nativeComponentName = '${componentName}';\n` +
        `} else if (UIManager.hasViewManagerConfig('${paperComponentNameDeprecated}')) {\n` +
        `  nativeComponentName = '${paperComponentNameDeprecated}';\n` +
        `} else {\n` +
        `  throw new Error('Failed to find native component for either "${componentName}" or "${paperComponentNameDeprecated}"');\n` +
        `}`
    )
  }

  parts.push(
    `export const __INTERNAL_VIEW_CONFIG = ${printViewConfig(nativeName, attributes, events)};`
  )
  parts.push(
    'export default NativeComponentRegistry.get(nativeComponentName, () => __INTERNAL_VIEW_CONFIG);'
  )
  if (commands.length) parts.push(printCommands(commands))

  return { imports: [...imports].sort(), body: parts.join('\n') }
}

/** the full generated block, matching the layout codegen's file template emits */
export function renderViewConfigModule(result: { imports: string[]; body: string }) {
  return `\n${FILE_HEADER}\n${result.imports.join('\n')}\n\n${result.body}\n`
}

export function getLibraryName(filename: string): string {
  const base = basename(filename)
  const replaced = base.replace(/NativeComponent\.[cm]?[jt]sx?$/, '')
  return replaced === base ? base.replace(/\.[cm]?[jt]sx?$/, '') : replaced
}
