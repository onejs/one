/**
 * Functions in this file are copied from `packages/vite/src/node/build.ts`.
 * Changes are marked with `// vxrn`.
 * Note that not all functions are copied.
 */

import type {
  BuildEnvironment,
  BuildEnvironmentOptions,
  BuildOptions,
  LibraryOptions,
  Logger,
  Plugin,
  ResolvedBuildEnvironmentOptions,
  ResolvedBuildOptions,
  ResolvedConfig,
} from 'vite'

import fs from 'node:fs'
import path from 'node:path'
import colors from 'picocolors'
import type {
  ExternalOption,
  InputOption,
  InternalModuleFormat,
  LoggingFunction,
  ModuleFormat,
  OutputOptions,
  PluginContext,
  RollupBuild,
  RollupCache,
  RollupError,
  RollupLog,
  RollupOptions,
  RollupOutput,
  RollupWatcher,
} from 'rollup'

import { displayTime } from './utils'
import { getHookHandler } from './plugins'
import type { RollupPluginHooks } from './typeUtils'
import { ROLLUP_HOOKS } from './constants'
import { isNativeEnvironment } from '../../environmentUtils'

/**
 * Build an App environment, or a App library (if libraryOptions is provided)
 *
 * This function is copied from Vite's source code, with some modifications and removals.
 * It will not work as the original function as we commented out some parts that are not needed for our use case.
 */
export async function buildEnvironment(
  config: ResolvedConfig,
  environment: BuildEnvironment,
  libOptions: LibraryOptions | false = false
): Promise<
  // vxrn: the rollup cache will be attached to the output
  {
    cache?: RollupCache | undefined
  } & (RollupOutput | RollupOutput[] | RollupWatcher)
> {
  // vxrn: isNative
  const isNative = isNativeEnvironment(environment)

  const options = config.build
  const { logger } = environment
  const ssr = environment.name !== 'client'

  logger.info(
    // vxrn: more accurate message
    // colors.cyan(
    //   `vite v${VERSION} ${colors.green(
    //     `building ${ssr ? `SSR bundle ` : ``}for ${config.mode}...`
    //   )}`
    // )
    colors.green(`building ${environment.name} bundle for ${config.mode}...`)
  )

  const resolve = (p: string) => path.resolve(config.root, p)
  const input = libOptions
    ? options.rollupOptions?.input ||
      (typeof libOptions.entry === 'string'
        ? resolve(libOptions.entry)
        : Array.isArray(libOptions.entry)
          ? libOptions.entry.map(resolve)
          : Object.fromEntries(
              Object.entries(libOptions.entry).map(([alias, file]) => [alias, resolve(file)])
            ))
    : typeof options.ssr === 'string'
      ? resolve(options.ssr)
      : options.rollupOptions?.input || resolve('index.html')

  if (ssr && typeof input === 'string' && input.endsWith('.html')) {
    throw new Error(
      `rollupOptions.input should not be an html file when building for SSR. ` +
        `Please specify a dedicated SSR entry.`
    )
  }
  if (config.build.cssCodeSplit === false) {
    const inputs =
      typeof input === 'string' ? [input] : Array.isArray(input) ? input : Object.values(input)
    if (inputs.some((input) => input.endsWith('.css'))) {
      throw new Error(
        `When "build.cssCodeSplit: false" is set, "rollupOptions.input" should not include CSS files.`
      )
    }
  }

  const outDir = resolve(options.outDir)

  // inject environment and ssr arg to plugin load/transform hooks
  // TODO: rework lib mode
  const plugins = (libOptions ? config : environment).plugins.map((p) =>
    injectEnvironmentToHooks(environment, p)
  )

  const rollupOptions: RollupOptions = {
    preserveEntrySignatures: ssr ? 'allow-extension' : libOptions ? 'strict' : false,
    cache: config.build.watch ? undefined : false,
    ...options.rollupOptions,
    input,

    // vxrn: filter out unnecessary plugin functions
    // plugins,
    plugins: plugins.map((p) => {
      if (p.name === 'vite:reporter') {
        return {
          ...p,
          // Printing out bundle details such as all the files that are included in the bundle and their sizes will cutter the terminal and also waste time.
          writeBundle: undefined,
        }
      }

      // Filter out unnecessary `renderChunk` hooks that are not needed for RN
      if (isNative && p.renderChunk) {
        if (
          [
            'vite:build-metadata', // Inserts asset and CSS related metadata which is not needed for RN (see: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/metadata.ts#L10-L16)
            'vite:worker', // See: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/worker.ts#L383-L429
            'vite:asset', // Seems not needed since with RN we have our own asset handling logic (see: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/asset.ts#L214-L227)
            'vite:css-post', // Seems not needed since we are not using CSS-in-JS for RN (see: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/css.ts#L560-L830)
            'vite:force-systemjs-wrap-complete', // Not needed since we are not using SystemJS (see: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/completeSystemWrap.ts#L12-L21)
            // 'vite:build-import-analysis',
            'vite:esbuild-transpile', // Seems to be ok to remove.
            'vite:reporter',
          ].includes(p.name)
        ) {
          return {
            ...p,
            renderChunk: undefined,
          }
        }
      }

      return p
    }),

    external: options.rollupOptions?.external,
    onwarn(warning, warn) {
      onRollupWarning(warning, warn, config)
    },
  }

  /**
   * The stack string usually contains a copy of the message at the start of the stack.
   * If the stack starts with the message, we remove it and just return the stack trace
   * portion. Otherwise the original stack trace is used.
   */
  function extractStack(e: RollupError) {
    const { stack, name = 'Error', message } = e

    // If we don't have a stack, not much we can do.
    if (!stack) {
      return stack
    }

    const expectedPrefix = `${name}: ${message}\n`
    if (stack.startsWith(expectedPrefix)) {
      return stack.slice(expectedPrefix.length)
    }

    return stack
  }

  /**
   * Esbuild code frames have newlines at the start and end of the frame, rollup doesn't
   * This function normalizes the frame to match the esbuild format which has more pleasing padding
   */
  const normalizeCodeFrame = (frame: string) => {
    const trimmedPadding = frame.replace(/^\n|\n$/g, '')
    return `\n${trimmedPadding}\n`
  }

  const enhanceRollupError = (e: RollupError) => {
    const stackOnly = extractStack(e)

    let msg = colors.red((e.plugin ? `[${e.plugin}] ` : '') + e.message)
    if (e.id) {
      msg += `\nfile: ${colors.cyan(e.id + (e.loc ? `:${e.loc.line}:${e.loc.column}` : ''))}`
    }
    if (e.frame) {
      msg += `\n` + colors.yellow(normalizeCodeFrame(e.frame))
    }

    e.message = msg

    // We are rebuilding the stack trace to include the more detailed message at the top.
    // Previously this code was relying on mutating e.message changing the generated stack
    // when it was accessed, but we don't have any guarantees that the error we are working
    // with hasn't already had its stack accessed before we get here.
    if (stackOnly !== undefined) {
      e.stack = `${e.message}\n${stackOnly}`
    }
  }

  // vxrn: we are not using this
  // const outputBuildError = (e: RollupError) => {
  //   enhanceRollupError(e)
  //   clearLine()
  //   logger.error(e.message, { error: e })
  // }

  let bundle: RollupBuild | undefined
  let startTime: number | undefined
  try {
    const buildOutputOptions = (output: OutputOptions = {}): OutputOptions => {
      // @ts-expect-error See https://github.com/vitejs/vite/issues/5812#issuecomment-984345618
      if (output.output) {
        logger.warn(
          `You've set "rollupOptions.output.output" in your config. ` +
            `This is deprecated and will override all Vite.js default output options. ` +
            `Please use "rollupOptions.output" instead.`
        )
      }
      if (output.file) {
        throw new Error(
          `Vite does not support "rollupOptions.output.file". ` +
            `Please use "rollupOptions.output.dir" and "rollupOptions.output.entryFileNames" instead.`
        )
      }
      if (output.sourcemap) {
        logger.warnOnce(
          colors.yellow(
            `Vite does not support "rollupOptions.output.sourcemap". ` +
              `Please use "build.sourcemap" instead.`
          )
        )
      }

      const format = output.format || 'es'

      // vxrn: we are not using this
      // const jsExt =
      //   !environment.options.webCompatible || libOptions
      //     ? resolveOutputJsExtension(
      //         format,
      //         findNearestPackageData(config.root, config.packageCache)?.data.type
      //       )
      //     : 'js'
      const jsExt = 'js'

      return {
        dir: outDir,
        // Default format is 'es' for regular and for SSR builds
        format,
        exports: 'auto',
        sourcemap: options.sourcemap,
        name: libOptions ? libOptions.name : undefined,
        hoistTransitiveImports: libOptions ? false : undefined,
        // es2015 enables `generatedCode.symbols`
        // - #764 add `Symbol.toStringTag` when build es module into cjs chunk
        // - #1048 add `Symbol.toStringTag` for module default export
        generatedCode: 'es2015',
        entryFileNames: ssr
          ? `[name].${jsExt}`
          : libOptions
            ? ({ name }) =>
                // vxrn: we are not using libOptions so we don't need this
                // resolveLibFilename(
                //   libOptions,
                //   format,
                //   name,
                //   config.root,
                //   jsExt,
                //   config.packageCache
                // )
                ''
            : path.posix.join(options.assetsDir, `[name]-[hash].${jsExt}`),
        chunkFileNames: libOptions
          ? `[name]-[hash].${jsExt}`
          : path.posix.join(options.assetsDir, `[name]-[hash].${jsExt}`),
        assetFileNames: libOptions
          ? `[name].[ext]`
          : path.posix.join(options.assetsDir, `[name]-[hash].[ext]`),
        inlineDynamicImports:
          output.format === 'umd' ||
          output.format === 'iife' ||
          // TODO: We need an abstraction for non-client environments?
          // We should remove the explicit 'client' hcek here.
          // Or maybe `inlineDynamicImports` should be an environment option?
          (environment.name !== 'client' &&
            environment.options.webCompatible &&
            (typeof input === 'string' || Object.keys(input).length === 1)),
        ...output,
      }
    }

    // resolve lib mode outputs
    const outputs = resolveBuildOutputs(options.rollupOptions?.output, libOptions, logger)
    const normalizedOutputs: OutputOptions[] = []

    if (Array.isArray(outputs)) {
      for (const resolvedOutput of outputs) {
        normalizedOutputs.push(buildOutputOptions(resolvedOutput))
      }
    } else {
      normalizedOutputs.push(buildOutputOptions(outputs))
    }

    // vxrn: we are not using these
    // const resolvedOutDirs = getResolvedOutDirs(
    //   config.root,
    //   options.outDir,
    //   options.rollupOptions?.output
    // )
    // const emptyOutDir = resolveEmptyOutDir(
    //   options.emptyOutDir,
    //   config.root,
    //   resolvedOutDirs,
    //   logger
    // )

    // vxrn: we are not using this
    // // watch file changes with rollup
    // if (config.build.watch) {
    //   logger.info(colors.cyan(`\nwatching for file changes...`))

    //   const resolvedChokidarOptions = resolveChokidarOptions(
    //     config,
    //     config.build.watch.chokidar,
    //     resolvedOutDirs,
    //     emptyOutDir
    //   )

    //   const { watch } = await import('rollup')
    //   const watcher = watch({
    //     ...rollupOptions,
    //     output: normalizedOutputs,
    //     watch: {
    //       ...config.build.watch,
    //       chokidar: resolvedChokidarOptions,
    //     },
    //   })

    //   watcher.on('event', (event) => {
    //     if (event.code === 'BUNDLE_START') {
    //       logger.info(colors.cyan(`\nbuild started...`))
    //       if (options.write) {
    //         prepareOutDir(resolvedOutDirs, emptyOutDir, config)
    //       }
    //     } else if (event.code === 'BUNDLE_END') {
    //       event.result.close()
    //       logger.info(colors.cyan(`built in ${event.duration}ms.`))
    //     } else if (event.code === 'ERROR') {
    //       outputBuildError(event.error)
    //     }
    //   })

    //   return watcher
    // }

    // write or generate files with rollup
    const { rollup } = await import('rollup')
    startTime = Date.now()
    bundle = await rollup(rollupOptions)

    // vxrn: we are not using this
    // if (options.write) {
    //   prepareOutDir(resolvedOutDirs, emptyOutDir, config)
    // }

    const res: RollupOutput[] = []
    for (const output of normalizedOutputs) {
      res.push(await bundle[options.write ? 'write' : 'generate'](output))
    }
    logger.info(`${colors.green(`✓ built in ${displayTime(Date.now() - startTime)}`)}`)

    // vxrn: attach Rollup cache to the output
    // return Array.isArray(outputs) ? res : res[0]
    const returnValue: (RollupOutput | RollupOutput[]) & { cache?: RollupCache | undefined } =
      Array.isArray(outputs) ? res : res[0]
    returnValue.cache = bundle.cache
    return returnValue
  } catch (e) {
    enhanceRollupError(e as any /* vxrn: 'as any' is added to make TypeScript happy */)
    clearLine()
    if (startTime) {
      logger.error(`${colors.red('x')} Build failed in ${displayTime(Date.now() - startTime)}`)
      startTime = undefined
    }
    throw e
  } finally {
    if (bundle) await bundle.close()
  }
}

export function resolveBuildOutputs(
  outputs: OutputOptions | OutputOptions[] | undefined,
  libOptions: LibraryOptions | false,
  logger: Logger
): OutputOptions | OutputOptions[] | undefined {
  if (libOptions) {
    const libHasMultipleEntries =
      typeof libOptions.entry !== 'string' && Object.values(libOptions.entry).length > 1
    const libFormats = libOptions.formats || (libHasMultipleEntries ? ['es', 'cjs'] : ['es', 'umd'])

    if (!Array.isArray(outputs)) {
      if (libFormats.includes('umd') || libFormats.includes('iife')) {
        if (libHasMultipleEntries) {
          throw new Error(
            'Multiple entry points are not supported when output formats include "umd" or "iife".'
          )
        }

        if (!libOptions.name) {
          throw new Error(
            'Option "build.lib.name" is required when output formats include "umd" or "iife".'
          )
        }
      }

      return libFormats.map((format) => ({ ...outputs, format }))
    }

    // By this point, we know "outputs" is an Array.
    if (libOptions.formats) {
      logger.warn(
        colors.yellow(
          '"build.lib.formats" will be ignored because "build.rollupOptions.output" is already an array format.'
        )
      )
    }

    outputs.forEach((output) => {
      if (['umd', 'iife'].includes(output.format!) && !output.name) {
        throw new Error(
          'Entries in "build.rollupOptions.output" must specify "name" when the format is "umd" or "iife".'
        )
      }
    })
  }

  return outputs
}

const warningIgnoreList = [`CIRCULAR_DEPENDENCY`, `THIS_IS_UNDEFINED`]
const dynamicImportWarningIgnoreList = [`Unsupported expression`, `statically analyzed`]

function clearLine() {
  const tty = process.stdout.isTTY && !process.env.CI
  if (tty) {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
  }
}

export function onRollupWarning(
  warning: RollupLog,
  warn: LoggingFunction,
  config: ResolvedConfig
): void {
  const viteWarn: LoggingFunction = (warnLog) => {
    let warning: string | RollupLog

    if (typeof warnLog === 'function') {
      warning = warnLog()
    } else {
      warning = warnLog
    }

    if (typeof warning === 'object') {
      if (warning.code === 'UNRESOLVED_IMPORT') {
        const id = warning.id
        const exporter = warning.exporter
        // throw unless it's commonjs external...
        if (!id || !id.endsWith('?commonjs-external')) {
          throw new Error(
            `[vite]: Rollup failed to resolve import "${exporter}" from "${id}".\n` +
              `This is most likely unintended because it can break your application at runtime.\n` +
              `If you do want to externalize this module explicitly add it to\n` +
              `\`build.rollupOptions.external\``
          )
        }
      }

      if (
        warning.plugin === 'rollup-plugin-dynamic-import-variables' &&
        dynamicImportWarningIgnoreList.some((msg) => warning.message.includes(msg))
      ) {
        return
      }

      if (warningIgnoreList.includes(warning.code!)) {
        return
      }

      if (warning.code === 'PLUGIN_WARNING') {
        config.logger.warn(
          `${colors.bold(
            colors.yellow(`[plugin:${warning.plugin}]`)
          )} ${colors.yellow(warning.message)}`
        )
        return
      }
    }

    warn(warnLog)
  }

  clearLine()
  const userOnWarn = config.build.rollupOptions?.onwarn
  if (userOnWarn) {
    userOnWarn(warning, viteWarn)
  } else {
    viteWarn(warning)
  }
}

export function injectEnvironmentToHooks(environment: BuildEnvironment, plugin: Plugin): Plugin {
  const { resolveId, load, transform } = plugin

  const clone = { ...plugin }

  for (const hook of Object.keys(clone) as RollupPluginHooks[]) {
    switch (hook) {
      case 'resolveId':
        clone[hook] = wrapEnvironmentResolveId(environment, resolveId)
        break
      case 'load':
        clone[hook] = wrapEnvironmentLoad(environment, load)
        break
      case 'transform':
        clone[hook] = wrapEnvironmentTransform(environment, transform)
        break
      default:
        if (ROLLUP_HOOKS.includes(hook)) {
          ;(clone as any)[hook] = wrapEnvironmentHook(environment, clone[hook])
        }
        break
    }
  }

  return clone
}

function wrapEnvironmentResolveId(
  environment: BuildEnvironment,
  hook?: Plugin['resolveId']
): Plugin['resolveId'] {
  if (!hook) return

  const fn = getHookHandler(hook)
  const handler: Plugin['resolveId'] = function (id, importer, options) {
    return fn.call(
      injectEnvironmentInContext(this, environment),
      id,
      importer,
      injectSsrFlag(options, environment)
    )
  }

  if ('handler' in hook) {
    return {
      ...hook,
      handler,
    } as Plugin['resolveId']
    // biome-ignore lint/style/noUselessElse: this code is copied from Vite
  } else {
    return handler
  }
}

function wrapEnvironmentLoad(environment: BuildEnvironment, hook?: Plugin['load']): Plugin['load'] {
  if (!hook) return

  const fn = getHookHandler(hook)
  const handler: Plugin['load'] = function (id, ...args) {
    return fn.call(
      injectEnvironmentInContext(this, environment),
      id,
      injectSsrFlag(args[0], environment)
    )
  }

  if ('handler' in hook) {
    return {
      ...hook,
      handler,
    } as Plugin['load']
    // biome-ignore lint/style/noUselessElse: this code is copied from Vite
  } else {
    return handler
  }
}

function wrapEnvironmentTransform(
  environment: BuildEnvironment,
  hook?: Plugin['transform']
): Plugin['transform'] {
  if (!hook) return

  const fn = getHookHandler(hook)
  const handler: Plugin['transform'] = function (code, importer, ...args) {
    return fn.call(
      injectEnvironmentInContext(this, environment),
      code,
      importer,
      injectSsrFlag(args[0], environment)
    )
  }

  if ('handler' in hook) {
    return {
      ...hook,
      handler,
    } as Plugin['transform']
    // biome-ignore lint/style/noUselessElse: this code is copied from Vite
  } else {
    return handler
  }
}

function wrapEnvironmentHook<HookName extends keyof Plugin>(
  environment: BuildEnvironment,
  hook?: Plugin[HookName]
): Plugin[HookName] {
  if (!hook) return

  const fn = getHookHandler(hook)
  if (typeof fn !== 'function') return hook

  const handler: Plugin[HookName] = function (this: PluginContext, ...args: any[]) {
    return fn.call(injectEnvironmentInContext(this, environment), ...args)
  }

  if ('handler' in hook) {
    return {
      ...hook,
      handler,
    } as Plugin[HookName]
    // biome-ignore lint/style/noUselessElse: this code is copied from Vite
  } else {
    return handler
  }
}

function injectEnvironmentInContext<Context extends PluginContext>(
  context: Context,
  environment: BuildEnvironment
) {
  context.environment ??= environment
  return context
}

function injectSsrFlag<T extends Record<string, any>>(
  options?: T,
  environment?: BuildEnvironment
): T & { ssr?: boolean } {
  const ssr = environment ? environment.name !== 'client' : true
  return { ...(options ?? {}), ssr } as T & {
    ssr?: boolean
  }
}
