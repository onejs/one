import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = resolve(process.argv[2]!)
if (!process.argv[2]) throw new Error('Usage: realapps-inject.ts <clean app snapshot>')
const fixtures = resolve(import.meta.dirname, '../fixtures')
const app = join(root, 'app')
const target = join(root, 'realapps-fixtures')
mkdirSync(target, { recursive: true })
const require = createRequire(
  join(resolve(import.meta.dirname, '../../..'), 'package.json')
)
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
  const argument = exported?.declaration?.arguments?.[0]
  const config = t.isObjectExpression(argument)
    ? argument
    : t.isObjectExpression(argument?.body)
      ? argument.body
      : argument?.body?.body?.find((node: any) => t.isReturnStatement(node))?.argument
  if (!t.isObjectExpression(config))
    throw new Error('Expected defineConfig object or a function returning an object')
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
  (node: any) => node.type === 'ExportDefaultDeclaration'
)
if (!statement) throw new Error('Root layout has no default export')
const value = statement.declaration
if (t.isFunctionDeclaration(value)) {
  // function names and internal recursion remain intact.
  value.id ??= t.identifier('RealAppsOriginalLayout')
  statement.declaration = value.id
  ast.program.body.splice(ast.program.body.indexOf(statement), 0, value)
} else if (!t.isIdentifier(value)) {
  const local = t.identifier('RealAppsOriginalLayout')
  ast.program.body.splice(
    ast.program.body.indexOf(statement),
    0,
    t.variableDeclaration('const', [t.variableDeclarator(local, value)])
  )
  statement.declaration = local
}
const originalName = statement.declaration.name
ast.program.body = ast.program.body.filter((node: any) => node !== statement)
const wrapper = parse(
  `import RealAppsMenu from '../realapps-fixtures/realapps-menu'
export default function RealAppsInstrumentedLayout(props: any) {
  return <RealAppsMenu><${originalName} {...props} /></RealAppsMenu>
}`,
  { sourceType: 'module', plugins: ['typescript', 'jsx'] }
)
ast.program.body.unshift(wrapper.program.body[0])
ast.program.body.push(wrapper.program.body[1])
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
