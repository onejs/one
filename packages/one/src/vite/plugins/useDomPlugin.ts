/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2023 Daishi Kato
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 **/

import { readFile } from 'node:fs/promises'
import type { Plugin, ResolvedConfig, UserConfig, PluginOption } from 'vite'
import { DOMRegistry, type DOMDescriptor } from '../dom/registry'
import { readDOMDirective } from '../dom/directive'
import { buildDOMAssets, DOM_DEV_PREFIX, domEntryPlugin, domHTML } from '../dom/browser'

interface NativeDOMContext {
  root: string
  platform: 'ios' | 'android'
  dev: boolean
  command?: 'serve' | 'build'
  assetsDest?: string
}

export interface UseDOMOptions {
  root: string
  routerRoot: string
  ignoredRouteFiles?: string[]
  metro?: boolean
  browserPlugins?: Plugin[]
}

export function useDOMPlugin(options: UseDOMOptions): Plugin {
  const registry = new DOMRegistry(options.root)
  let config: ResolvedConfig
  let assetsInclude: UserConfig['assetsInclude']
  let suppliedPlugins: Plugin[] = []
  let browserPlugins: Plugin[] = options.browserPlugins ?? []

  const isDOM = (code: string, id: string) => readDOMDirective(code, id, options)

  function proxy(id: string) {
    const descriptor = registry.register(id)
    return {
      code: `import { createDOMComponent } from "one/dom/native";\nexport default createDOMComponent(${JSON.stringify(descriptor.id)});`,
      map: null,
      meta: { oneDOM: descriptor },
    }
  }

  function nativePlugin(context: NativeDOMContext): import('rolldown').Plugin {
    const transformed = new Set<string>()
    return {
      name: 'one:use-dom-native',
      transform: {
        order: 'pre',
        filter: { id: /\.[cm]?[jt]sx?$/ },
        handler(code, id) {
          if (!isDOM(code, id)) {
            if (!transformed.delete(id)) return
            registry.invalidate(id)
            return { code, map: null, meta: { oneDOM: null } }
          }
          transformed.add(id)
          // substitution precedes dependency resolution: nothing in the browser
          // source is allowed into the native graph, even an unused import.
          return proxy(id)
        },
      },
      async generateBundle() {
        const entries: DOMDescriptor[] = []
        for (const id of this.getModuleIds()) {
          const entry = this.getModuleInfo(id)?.meta.oneDOM as DOMDescriptor | undefined
          if (entry) entries.push(entry)
        }
        registry.replaceGraph(context.platform, entries)
        if (context.command === 'build' && (entries.length || context.assetsDest)) {
          if (!context.assetsDest)
            this.error('[one/use-dom] native DOM assets require assetsDest')
          if (!config)
            this.error(
              '[one/use-dom] resolve the One Vite config before building DOM assets'
            )
          // the native bundle cannot return to packaging/Updates until every
          // HTML entry and its shared chunks/assets have been written.
          await buildDOMAssets(
            entries,
            registry,
            config,
            browserPlugins,
            context.assetsDest!,
            assetsInclude
          )
        }
      },
    }
  }

  const entryPlugin = domEntryPlugin(registry, () => config?.command === 'serve')
  return {
    name: 'one:use-dom',
    enforce: 'pre',
    api: { vxrnNative: nativePlugin, registry },
    async config(userConfig) {
      assetsInclude = userConfig.assetsInclude
      const flatten = async (items: PluginOption[]): Promise<Plugin[]> => {
        const resolved = await Promise.all(items)
        const nested = await Promise.all(
          resolved.map((item) =>
            Array.isArray(item) ? flatten(item) : item ? [item] : []
          )
        )
        return nested.flat()
      }
      suppliedPlugins = await flatten(userConfig.plugins ?? [])
    },
    configResolved(resolved) {
      config = resolved
      // keep application browser plugins (including CSS preprocessors), while
      // excluding Vite internals and One's router/native build orchestration.
      browserPlugins = [
        ...(options.browserPlugins ?? []),
        ...suppliedPlugins.filter(
          (plugin) =>
            !/^(?:vite:|one[:-]|vxrn[:-])/.test(plugin.name) &&
            !options.browserPlugins?.includes(plugin)
        ),
      ]
    },
    resolveId: entryPlugin.resolveId,
    load: entryPlugin.load,
    transform: {
      order: 'pre',
      filter: { id: /\.[cm]?[jt]sx?$/ },
      handler(code, id) {
        if (!isDOM(code, id)) return
        if (
          options.metro &&
          (this.environment?.name === 'ios' || this.environment?.name === 'android')
        )
          this.error(
            '[one/use-dom] "use dom" requires native.bundler: "vite"; Metro is unsupported'
          )
        if (this.environment?.name === 'ios' || this.environment?.name === 'android') {
          return proxy(id)
        }
        // web/SSR retain the original component and existing SSR rules.
      },
    },
    configureServer(server) {
      const changed = async (file: string) => {
        if (!registry.hasModule(file)) return
        // ordinary browser edits keep their descriptor and use Vite's existing
        // refresh graph. directive removal revokes the opaque page lookup.
        try {
          if (isDOM(await readFile(file, 'utf8'), file)) return
        } catch {
          // the normal transform reports syntax and directive errors.
        }
        registry.invalidate(file)
      }
      server.watcher.on('change', changed)
      server.watcher.on('unlink', changed)
      server.httpServer?.once('close', () => {
        server.watcher.off('change', changed)
        server.watcher.off('unlink', changed)
      })
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0]
        if (!pathname?.startsWith(DOM_DEV_PREFIX)) return next()
        const match = /^\/_one\/dom\/(dom-[a-f0-9]{32})\/$/.exec(pathname)
        const descriptor = match && registry.get(match[1])
        if (!descriptor) {
          res.statusCode = 404
          res.end('Unknown One DOM entry')
          return
        }
        try {
          if (!isDOM(await readFile(descriptor.moduleId, 'utf8'), descriptor.moduleId)) {
            registry.invalidate(descriptor.moduleId)
            res.statusCode = 404
            res.end('One DOM directive removed')
            return
          }
          const html = await server.transformIndexHtml(
            pathname,
            domHTML(descriptor.id),
            req.originalUrl
          )
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(html)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
