import { createHash } from 'node:crypto'
import { isBuiltin } from 'node:module'
import { dirname, isAbsolute, join } from 'node:path'
import { statSync } from 'node:fs'
import { rolldown, type Plugin } from 'rolldown'
import { parseSync } from 'oxc-parser'
import { getClosureVariables, JS_GLOBALS, transformHermesLoops } from '@vxrn/compiler'
import { hermesCompatSWCPlugin, hermesLoopsPlugin } from '../utils/createNativeDevEngine'

/**
 * bundles selected, synchronous pure-function exports for normal worklets mode.
 * install in native.bundlerOptions.plugins. the replacement module exposes only
 * the configured exports; each entry owns its complete dependency graph.
 */
export function workletImportsPlugin(imports: Record<string, readonly string[]>): Plugin {
  const selections = new Map(
    Object.entries(imports).map(([source, names]) => [source, [...new Set(names)]])
  )

  const rejectRuntimeDependency = (source: string) => {
    const normalized = source.replace(/\\/g, '/')
    if (
      isBuiltin(source) ||
      /(?:^|\/node_modules\/)(?:react|react-native|react-native-worklets|react-native-reanimated|expo-modules-core)(?:\/|$)/.test(
        normalized
      ) ||
      /(?:^|\/node_modules\/)@react-native\//.test(normalized)
    ) {
      throw new Error(
        `[worklet imports] runtime dependency ${source} is not pure JavaScript`
      )
    }
  }

  return {
    name: 'vxrn:worklet-imports',
    options(nativeOptions) {
      // one config can share this plugin across simultaneous ios/android builds.
      const modules = new Map<string, { entry: string; names: string[]; key: string }>()
      const instance: Plugin = {
        name: 'vxrn:worklet-imports:bundle',
        async resolveId(source, importer, options) {
          const names = selections.get(source)
          if (!names) return
          if (!names.length)
            throw new Error(`[worklet imports] no exports selected for ${source}`)
          if (options.kind !== 'import-statement') {
            throw new Error(`[worklet imports] ${source} requires a static ESM import`)
          }
          rejectRuntimeDependency(source)
          const resolved = await this.resolve(source, importer, { skipSelf: true })
          if (
            !resolved ||
            resolved.external ||
            !isAbsolute(resolved.id) ||
            !statSync(resolved.id, { throwIfNoEntry: false })?.isFile()
          ) {
            throw new Error(
              `[worklet imports] ${source} must resolve to a JavaScript file`
            )
          }
          rejectRuntimeDependency(resolved.id)
          const key = createHash('sha256')
            .update(JSON.stringify([resolved.id, names]))
            .digest('hex')
            .slice(0, 16)
          // a file-shaped id lets the existing native compiler process the directives.
          const id = join(dirname(resolved.id), `__one_worklet_imports_${key}.js`)
          modules.set(id, { entry: resolved.id, names, key })
          return id
        },
        moduleParsed(info) {
          if (
            !info.code ||
            ![...selections.keys()].some((source) => info.code!.includes(source))
          )
            return
          const { program, errors } = parseSync(info.id, info.code, {
            lang: /\.[cm]?ts$/.test(info.id)
              ? 'ts'
              : info.id.endsWith('.tsx')
                ? 'tsx'
                : 'jsx',
          })
          if (errors.length) throw new Error(errors[0].message)
          for (const node of program.body) {
            if (
              node.type !== 'ImportDeclaration' &&
              node.type !== 'ExportNamedDeclaration'
            )
              continue
            const source = node.source?.value
            if (!source) continue
            const names = selections.get(source)
            if (!names) continue
            for (const specifier of node.specifiers) {
              const imported =
                specifier.type === 'ImportDefaultSpecifier'
                  ? 'default'
                  : specifier.type === 'ImportSpecifier'
                    ? specifier.imported.type === 'Identifier'
                      ? specifier.imported.name
                      : specifier.imported.value
                    : specifier.type === 'ExportSpecifier'
                      ? specifier.local.type === 'Identifier'
                        ? specifier.local.name
                        : specifier.local.value
                      : undefined
              // native's shimMissingExports would otherwise silently emit undefined.
              if (imported !== undefined && !names.includes(imported)) {
                throw new Error(
                  `[worklet imports] ${info.id} imports unselected export ${imported} from ${source}`
                )
              }
            }
          }
        },
        async load(id) {
          const selected = modules.get(id)
          if (!selected) return
          const outerContext = this
          const innerEntry = '\0one-worklet-import-entry'
          const bundle = await rolldown({
            cwd: nativeOptions.cwd,
            input: innerEntry,
            platform: 'neutral',
            resolve: nativeOptions.resolve,
            transform: nativeOptions.transform,
            shimMissingExports: false,
            plugins: [
              {
                name: 'vxrn:pure-worklet-module',
                resolveId(source, _importer, options) {
                  if (source === innerEntry) return source
                  if (options.kind === 'dynamic-import') {
                    throw new Error(
                      `[worklet imports] dynamic imports are unsupported in ${selected.entry}`
                    )
                  }
                  rejectRuntimeDependency(source)
                },
                load(source) {
                  if (source === innerEntry) {
                    return `export { ${selected.names.map((name, index) => `${JSON.stringify(name)} as __export${index}`).join(', ')} } from ${JSON.stringify(selected.entry)};`
                  }
                },
                moduleParsed(info) {
                  rejectRuntimeDependency(info.id)
                  if (isAbsolute(info.id)) outerContext.addWatchFile(info.id)
                  if (info.packageJsonPath)
                    outerContext.addWatchFile(info.packageJsonPath)
                },
              },
              hermesCompatSWCPlugin(false),
              hermesLoopsPlugin(),
            ],
          })
          let code: string
          try {
            const output = await bundle.generate({
              format: 'iife',
              name: '__oneWorkletBundle',
            })
            const chunk = output.output[0]
            if (
              output.output.length !== 1 ||
              chunk.type !== 'chunk' ||
              chunk.imports.length ||
              chunk.dynamicImports.length
            ) {
              throw new Error(
                `[worklet imports] ${selected.entry} must produce one self-contained JavaScript module`
              )
            }
            // also cover closure-bearing loops in helpers emitted by the bundler.
            code = transformHermesLoops(chunk.code, id)?.code ?? chunk.code
            for (const file of await bundle.watchFiles) {
              if (isAbsolute(file)) outerContext.addWatchFile(file)
            }
          } finally {
            await bundle.close()
          }

          const loader = `__oneLoadWorkletModule_${selected.key}`
          const loaderCode = `function ${loader}() {
  'worklet';
  const cache = globalThis.__oneWorkletImportCache || (globalThis.__oneWorkletImportCache = new WeakMap());
  let namespace = cache.get(${loader});
  if (namespace === undefined) {
    ${code}
    namespace = __oneWorkletBundle;
    cache.set(${loader}, namespace);
  }
  return namespace;
}`
          const parsed = parseSync(id, loaderCode, { lang: 'js' })
          if (parsed.errors.length) throw new Error(parsed.errors[0].message)
          const captures = getClosureVariables(
            parsed.program.body[0],
            new Set([...JS_GLOBALS, 'arguments'])
          )
          if (captures.length) {
            throw new Error(
              `[worklet imports] ${selected.entry} requires unsupported runtime globals: ${captures.join(', ')}`
            )
          }
          return `${loaderCode}\n${selected.names
            .map(
              (name, index) => `
function __oneExport${index}(...args) {
  'worklet';
  return (0, ${loader}().__export${index})(...args);
}
export { __oneExport${index} as ${JSON.stringify(name)} };
`
            )
            .join('\n')}`
        },
      }
      return {
        ...nativeOptions,
        plugins: [instance, nativeOptions.plugins],
      }
    },
  }
}
