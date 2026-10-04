import MagicString from 'magic-string'
import { parseSync, Visitor } from 'oxc-parser'
import { dirname, relative } from 'node:path'
import type { Plugin } from 'rolldown'

// both bundlers select the same imported function, without serializing closures.
export function backgroundComputationPlugin(platform: 'web' | 'native'): Plugin {
  return {
    name: `one:background-computation:${platform}`,
    transform: {
      order: 'pre',
      async handler(code, id) {
        if (
          !code.includes('defineBackgroundComputation') ||
          id.includes('.__one_background_worker_')
        )
          return
        const { program, errors } = parseSync(id, code, {
          lang: /\.[cm]?tsx?(?:\?|$)/.test(id)
            ? id.includes('.tsx')
              ? 'tsx'
              : 'ts'
            : 'jsx',
        })
        if (errors.length) throw new Error(errors[0].message)
        const definitions = new Set<string>()
        const imports = new Map<string, { source: string; name: string }>()
        for (const node of program.body) {
          if (node.type !== 'ImportDeclaration') continue
          for (const specifier of node.specifiers) {
            if (specifier.type !== 'ImportSpecifier') continue
            const name =
              specifier.imported.type === 'Identifier'
                ? specifier.imported.name
                : specifier.imported.value
            if (
              node.source.value === 'one/background' &&
              name === 'defineBackgroundComputation'
            )
              definitions.add(specifier.local.name)
            imports.set(specifier.local.name, { source: node.source.value, name })
          }
        }
        if (!definitions.size) return
        const output = new MagicString(code)
        let count = 0
        for (const statement of program.body) {
          const node =
            statement.type === 'ExportNamedDeclaration'
              ? statement.declaration
              : statement
          if (node?.type !== 'VariableDeclaration') continue
          for (const declaration of node.declarations) {
            const call = declaration.init
            if (
              call?.type !== 'CallExpression' ||
              call.callee.type !== 'Identifier' ||
              !definitions.has(call.callee.name)
            )
              continue
            const argument = call.arguments[0]
            const calculate =
              argument?.type === 'Identifier' ? imports.get(argument.name) : undefined
            if (
              call.arguments.length !== 1 ||
              !calculate ||
              !calculate.source.startsWith('.')
            ) {
              throw new Error(
                `[one background] ${id}: defineBackgroundComputation requires one named import from a relative pure module at module scope`
              )
            }
            const selected = encodeURIComponent(calculate.name)
            if (platform === 'native') {
              const local = `__oneBackgroundCalculate${count++}`
              output.prepend(
                `import { ${JSON.stringify(calculate.name)} as ${local} } from ${JSON.stringify(`${calculate.source}?one-background=${selected}`)};\n`
              )
              output.overwrite(argument.start, argument.end, local)
            } else {
              const resolved = await this.resolve(calculate.source, id)
              if (!resolved || resolved.external)
                throw new Error(
                  `[one background] cannot resolve ${calculate.source} from ${id}`
                )
              const worker = `${resolved.id}.__one_background_worker_${Buffer.from(calculate.name).toString('hex')}.js`
              const url = `./${relative(dirname(id), worker).replaceAll('\\', '/')}`
              output.appendLeft(
                call.end - 1,
                `, () => new Worker(new URL(${JSON.stringify(url)}, import.meta.url), { type: 'module' })`
              )
              count++
            }
          }
        }
        let calls = 0
        new Visitor({
          CallExpression(call) {
            if (call.callee.type === 'Identifier' && definitions.has(call.callee.name))
              calls++
          },
        }).visit(program)
        if (calls !== count)
          throw new Error(
            `[one background] ${id}: definitions must be module-scope variables`
          )
        if (!count) return
        return { code: output.toString(), map: output.generateMap({ hires: true }) }
      },
    },
    resolveId(source) {
      if (
        platform === 'web' &&
        /\.__one_background_worker_[a-f0-9]+\.js(?:\?|$)/.test(source)
      )
        return source
    },
    load(id) {
      if (platform !== 'web') return
      const match = id.match(/^(.*?)\.__one_background_worker_([a-f0-9]+)\.js(?:\?.*)?$/)
      if (!match) return
      const [, source, hex] = match
      const name = Buffer.from(hex, 'hex').toString()
      return `import { ${JSON.stringify(name)} as calculate } from ${JSON.stringify(source)};
self.onmessage = ({ data: { revision, input } }) => {
  try {
    const value = calculate(input);
    if (value instanceof Promise) throw new TypeError('background computations must be synchronous');
    self.postMessage({ ok: true, result: { revision, value } });
  } catch (error) {
    self.postMessage({ ok: false, revision, error: String(error) });
  }
};`
    },
  }
}
