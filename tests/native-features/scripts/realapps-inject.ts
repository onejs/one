import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = resolve(process.argv[2]!)
if (!process.argv[2]) throw new Error('Usage: realapps-inject.ts <clean app snapshot>')
const fixtures = resolve(import.meta.dirname, '../fixtures')
const app = join(root, 'app')
const target = join(root, 'realapps-fixtures')
mkdirSync(target, { recursive: true })
const require = createRequire(join(root, 'package.json'))
// the routing fixture adds an optional package the product may not use.
// pin its package graph to the same set as the One artifact under test.
const appRequire = createRequire(join(root, 'package.json'))
const oneManifest = JSON.parse(
  readFileSync(appRequire.resolve('one/package.json'), 'utf8')
)
const manifestPath = join(root, 'package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.devDependencies ??= {}
if (!manifest.dependencies?.['@react-navigation/drawer'])
  manifest.devDependencies['@react-navigation/drawer'] =
    oneManifest.peerDependencies['@react-navigation/drawer']
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
const { parse } = require('@babel/parser')
const { default: generate } = require('@babel/generator')
const t = require('@babel/types')
if (process.argv[3]) {
  const port = Number(process.argv[3])
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Invalid dev port')
  const configPath = join(root, 'vite.config.ts')
  const originalConfig = join(root, 'realapps-original-vite.config.ts')
  if (!existsSync(originalConfig)) cpSync(configPath, originalConfig)
  const configAst = parse(readFileSync(originalConfig, 'utf8'), {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  })
  const exported = configAst.program.body.find((node: any) =>
    t.isExportDefaultDeclaration(node)
  )
  const declaration = exported?.declaration
  const argument = t.isCallExpression(declaration)
    ? declaration.arguments[0]
    : t.isTSSatisfiesExpression(declaration)
      ? declaration.expression
      : declaration
  const config = t.isObjectExpression(argument)
    ? argument
    : t.isObjectExpression(argument?.body)
      ? argument.body
      : argument?.body?.body?.find((node: any) => t.isReturnStatement(node))?.argument
  if (!t.isObjectExpression(config))
    throw new Error('Expected an inline Vite config object or function returning one')
  let server = config.properties.find((node: any) => node.key?.name === 'server')
  if (!server) {
    server = t.objectProperty(t.identifier('server'), t.objectExpression([]))
    config.properties.push(server)
  }
  if (!t.isObjectExpression(server.value))
    throw new Error('Expected an inline server configuration')
  server.value.properties = server.value.properties.filter(
    (node: any) => node.key?.name !== 'port'
  )
  server.value.properties.push(
    t.objectProperty(t.identifier('port'), t.numericLiteral(port))
  )
  writeFileSync(configPath, generate(configAst).code + '\n')
}
const layout = join(app, '_layout.tsx')
const original = join(root, 'realapps-original-layout.tsx')
if (!existsSync(original)) cpSync(layout, original)
const ast = parse(readFileSync(original, 'utf8'), {
  sourceType: 'module',
  plugins: ['typescript', 'jsx'],
})
const statement = ast.program.body.find(
  (node: any) =>
    t.isExportDefaultDeclaration(node) ||
    (t.isExportNamedDeclaration(node) &&
      t.isFunctionDeclaration(node.declaration) &&
      /^[A-Z]/.test(node.declaration.id?.name ?? ''))
)
if (!statement) throw new Error('Root layout has no exported component')
const value = statement.declaration
const component = t.isIdentifier(value)
  ? ast.program.body
      .map((node: any) => node.declaration ?? node)
      .find((node: any) => t.isFunctionDeclaration(node) && node.id?.name === value.name)
  : value
if (!t.isFunctionDeclaration(component) && !t.isArrowFunctionExpression(component))
  throw new Error('Expected a function root layout')
let hasRootStack = false
function registerFixtureScreens(node: any): any {
  if (!node || typeof node !== 'object') return node
  if (
    t.isJSXElement(node) &&
    t.isJSXIdentifier(node.openingElement.name, { name: 'Stack' })
  ) {
    hasRootStack = true
    node.openingElement.selfClosing = false
    node.closingElement ??= t.jsxClosingElement(t.jsxIdentifier('Stack'))
    for (const name of [
      'realapps-api', 'realapps-api-zoom',
      'realapps-routing/stack', 'realapps-routing/tabs', 'realapps-routing/drawer',
    ]) {
      node.children.push(t.jsxElement(
        t.jsxOpeningElement(t.jsxMemberExpression(t.jsxIdentifier('Stack'), t.jsxIdentifier('Screen')), [
          t.jsxAttribute(t.jsxIdentifier('name'), t.stringLiteral(name)),
        ], true), null, [], true,
      ))
    }
  }
  const isRootStack = t.isJSXElement(node) &&
    t.isJSXIdentifier(node.openingElement.name, { name: 'Stack' })
  for (const key of t.VISITOR_KEYS[node.type] ?? []) {
    node[key] = Array.isArray(node[key])
      ? node[key].map(registerFixtureScreens)
      : registerFixtureScreens(node[key])
  }
  // the menu must mount with the router, after any app readiness gates.
  return isRootStack ? wrapOutput(node) : node
}
registerFixtureScreens(component)
function wrapOutput(node: any): any {
  if (
    t.isJSXElement(node) &&
    t.isJSXIdentifier(node.openingElement.name) &&
    /^[a-z]/.test(node.openingElement.name.name)
  ) {
    if (node.openingElement.name.name === 'head') return node
    node.children = node.children.map((child: any) =>
      t.isJSXElement(child)
        ? wrapOutput(child)
        : t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)
          ? t.jsxExpressionContainer(wrapOutput(child.expression))
          : child
    )
    return node
  }
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier('RealAppsMenu'), [], false),
    t.jsxClosingElement(t.jsxIdentifier('RealAppsMenu')),
    [t.jsxExpressionContainer(node)],
    false
  )
}
function wrapReturns(node: any) {
  if (!node || typeof node !== 'object') return
  if (t.isReturnStatement(node)) {
    if (node.argument) node.argument = wrapOutput(node.argument)
    return
  }
  for (const key of t.VISITOR_KEYS[node.type] ?? []) {
    for (const child of Array.isArray(node[key]) ? node[key] : [node[key]]) {
      if (child && !t.isFunction(child)) wrapReturns(child)
    }
  }
}
if (!hasRootStack) {
  if (t.isBlockStatement(component.body)) wrapReturns(component.body)
  else component.body = wrapOutput(component.body)
}
ast.program.body.unshift(
  parse("import RealAppsMenu from '../realapps-fixtures/realapps-menu'", {
    sourceType: 'module',
  }).program.body[0]
)
writeFileSync(layout, generate(ast).code + '\n')
for (const name of ['Counter.tsx', 'Other.tsx'])
  cpSync(join(fixtures, 'realapps-routing', name), join(target, name))
for (const name of ['stack', 'tabs', 'drawer'])
  cpSync(join(fixtures, 'realapps-routing', name), join(app, 'realapps-routing', name), {
    recursive: true,
  })
for (const name of [
  'realapps-menu.tsx',
  'realapps-api.native.tsx',
  'realapps-api-report.tsx',
  'realapps-api-coverage.ts',
  'realapps-api-services.native.tsx',
  'realapps-api-ui.native.tsx',
  'realapps-api-menus.native.tsx',
  'realapps-api-ios.tsx',
  'realapps-api-ios.ios.tsx',
  'realapps-api-ios.android.tsx',
  'realapps-api-widgets.tsx',
  'realapps-api-widgets.ios.tsx',
  'realapps-api-widgets.android.tsx',
  'realapps-api-zoom.ios.tsx',
  'realapps-api-zoom.android.tsx',
])
  cpSync(join(fixtures, name), join(target, name))
writeFileSync(
  join(app, 'realapps-api.native.tsx'),
  "export { default } from '../realapps-fixtures/realapps-api.native'\n"
)
writeFileSync(
  join(app, 'realapps-api-zoom.native.tsx'),
  "export { default } from '../realapps-fixtures/realapps-api-zoom'\n"
)
for (const name of ['realapps-api', 'realapps-api-zoom'])
  writeFileSync(
    join(app, `${name}.tsx`),
    "import { Text } from 'react-native'\nexport default function NativeProbeOnWeb() { return <Text>Native API probe runs on the claimed device.</Text> }\n"
  )
mkdirSync(join(root, 'assets'), { recursive: true })
cpSync(
  resolve(fixtures, '../assets/OneNativeTestFont-Regular.ttf'),
  join(root, 'assets/OneNativeTestFont-Regular.ttf')
)
console.log('RAN added fixture routes and native-only menu beside original root layout')
