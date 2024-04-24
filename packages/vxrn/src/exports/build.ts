import { build as esbuild } from 'esbuild'
import { resolve as importMetaResolve } from 'import-meta-resolve'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path, { dirname, resolve } from 'node:path'
import { mergeConfig, build as viteBuild, type UserConfig } from 'vite'

import FSExtra from 'fs-extra'
import type { OutputAsset, OutputChunk, RollupOutput } from 'rollup'
import type { VXRNConfig } from '../types'
import { getBaseViteConfig } from '../utils/getBaseViteConfig'
import { getHtml } from '../utils/getHtml'
import { getOptionsFilled, type VXRNConfigFilled } from '../utils/getOptionsFilled'
import { ssrOptimizeDeps } from '../constants'

export const resolveFile = (path: string) => {
  try {
    return importMetaResolve(path, import.meta.url).replace('file://', '')
  } catch {
    return require.resolve(path)
  }
}

const { ensureDir, existsSync, readFile, pathExists } = FSExtra

// web only for now

export const build = async (optionsIn: VXRNConfig) => {
  const options = await getOptionsFilled(optionsIn)

  // TODO?
  process.env.NODE_ENV = 'production'

  let webBuildConfig = mergeConfig(
    getBaseViteConfig({
      mode: 'production',
    }),
    {
      root: options.root,
      clearScreen: false,
      optimizeDeps: ssrOptimizeDeps,
    }
  ) satisfies UserConfig

  if (options.webConfig) {
    webBuildConfig = mergeConfig(webBuildConfig, options.webConfig) as any
  }

  console.info(`build client`)
  await viteBuild(
    mergeConfig(webBuildConfig, {
      build: {
        ssrManifest: true,
        outDir: 'dist/client',
      },
    } satisfies UserConfig)
  )

  console.info(`build server`)
  const { output } = (await viteBuild(
    mergeConfig(webBuildConfig, {
      plugins: [
        {
          name: 'test',
          enforce: 'pre',
          async resolveId(id, importer = '') {
            if (id[0] === '.') {
              const absolutePath = resolve(dirname(importer), id)
              const webPath = absolutePath.replace(/(.m?js)/, '') + '.web.js'
              if (webPath === id) return
              try {
                const directoryPath = absolutePath + '/index.web.js'
                if (await pathExists(directoryPath)) {
                  console.info(`temp fix found ${directoryPath}`)
                  return directoryPath
                }
                if (await pathExists(webPath)) {
                  console.info(`temp fix found ${webPath}`)
                  return webPath
                }
              } catch (err) {
                console.warn(`error probably fine`, err)
              }
            }
          },
        },
      ],

      resolve: {
        alias: {
          'react-native': 'react-native-web-lite',
        },
      },

      optimizeDeps: {
        esbuildOptions: {
          format: 'cjs',
        },
      },

      ssr: {
        noExternal: true,
        optimizeDeps: ssrOptimizeDeps,
      },

      build: {
        // we want one big file of css
        cssCodeSplit: false,
        ssr: 'src/entry-server.tsx',
        outDir: 'dist/server',
        rollupOptions: {
          external: [],
        },
      },
    })
  )) as RollupOutput

  console.info(`generating static pages`)
  await generateStaticPages(options, output)
}

async function generateStaticPages(
  options: VXRNConfigFilled,
  serverOutput: (OutputChunk | OutputAsset)[]
) {
  const toAbsolute = (p) => path.resolve(options.root, p)

  const staticDir = toAbsolute(`dist/static`)
  await ensureDir(staticDir)
  const template = fs.readFileSync(toAbsolute('index.html'), 'utf-8')

  const render = (await import(`${options.root}/dist/server/entry-server.js`)).render

  // load routes
  // const entry = serverOutput.find(
  //   (x) => x.type === 'chunk' && x.facadeModuleId?.includes('entry-server')
  // )

  const assets: OutputAsset[] = []

  const allRoutes = (
    await Promise.all(
      serverOutput.flatMap(async (output) => {
        if (output.type === 'asset') {
          assets.push(output)
          return []
        }

        const id = output.facadeModuleId || ''
        const file = path.basename(id)
        const name = file.replace(/\.[^/.]+$/, '')

        if (!id || file[0] === '_' || file.includes('entry-server')) {
          return []
        }
        if (id.includes('+api')) {
          return []
        }

        const endpointPath = path.join(options.root, 'dist/server', output.fileName)
        const exported = await import(endpointPath)

        const paramsList = ((await exported.generateStaticParams?.()) ?? [{}]) as Object[]

        return await Promise.all(
          paramsList.map(async (params) => {
            const path = getUrl(params)
            const props =
              (await exported.generateStaticProps?.({ path: getUrl(params), params })) ?? {}
            return { path, props }
          })
        )

        function getUrl(_params = {}) {
          return name === 'index'
            ? '/'
            : `/${name
                .split('/')
                .map((part) => {
                  if (part[0] === '[') {
                    const found = _params[part.slice(1, part.length - 1)]
                    if (!found) {
                      console.warn('not found', { _params, part })
                    }
                    return found
                  }
                  return part
                })
                .join('/')}`
        }
      })
    )
  ).flat()

  // for now just inline
  const cssStringRaw = assets
    .filter((x) => x.name?.endsWith('.css'))
    .map((x) => x.source)
    .join('\n\n')

  // awkward way to get prefixes:
  const tmpCssFile = path.join(tmpdir(), 'tmp.css')
  await FSExtra.writeFile(tmpCssFile, cssStringRaw, 'utf-8')
  await esbuild({
    entryPoints: [tmpCssFile],
    target: 'safari17',
    bundle: true,
    minifyWhitespace: true,
    sourcemap: false,
    outfile: tmpCssFile,
    loader: { '.css': 'css' },
  })
  const cssString = await FSExtra.readFile(tmpCssFile, 'utf-8')

  // pre-render each route...
  for (const { path, props } of allRoutes) {
    const { appHtml, headHtml } = await render({ path, props })
    const slashFileName = `${path === '/' ? '/index' : path}.html`
    const clientHtmlPath = toAbsolute(`dist/client${slashFileName}`)
    const clientHtml = existsSync(clientHtmlPath) ? await readFile(clientHtmlPath, 'utf-8') : null
    const html = getHtml({
      template: clientHtml || template,
      appHtml,
      headHtml,
      props,
      css: cssString,
    })
    const filePath = toAbsolute(`dist/static${slashFileName}`)
    fs.writeFileSync(toAbsolute(filePath), html)
  }
}
