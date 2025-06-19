import type { Plugin, ViteDevServer } from 'vite'
import { VIRTUAL_SSR_CSS_ENTRY, VIRTUAL_SSR_CSS_HREF } from '../../constants'

// thanks to hi-ogawa https://github.com/hi-ogawa/vite-plugins/tree/main/packages/ssr-css

export function SSRCSSPlugin(pluginOpts: { entries: string[] }): Plugin {
  let server: ViteDevServer

  return {
    name: `one-plugin-ssr-css`,
    apply: 'serve',
    configureServer(server_) {
      server = server_

      // invalidate virtual modules for each direct request
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.includes(VIRTUAL_SSR_CSS_HREF)) {
          invalidateModule(server, '\0' + VIRTUAL_SSR_CSS_ENTRY + '?direct')

          let code = await collectStyle(server, pluginOpts.entries)

          res.setHeader('Content-Type', 'text/css')
          res.setHeader('Cache-Control', 'no-store')
          res.setHeader('Vary', '*')
          res.write(code)
          res.end()
          return
        }
        next()
      })
    },

    // virtual module
    // (use `startsWith` since Vite adds `?direct` for raw css request)
    resolveId(source, _importer, _options) {
      return source.startsWith(VIRTUAL_SSR_CSS_ENTRY) ? '\0' + source : undefined
    },

    async load(id, _options) {
      if (id.startsWith('\0' + VIRTUAL_SSR_CSS_ENTRY)) {
        const url = new URL(id.slice(1), 'https://test.local')
        let code = await collectStyle(server, pluginOpts.entries)
        if (!url.searchParams.has('direct')) {
          code = `export default ${JSON.stringify(code)}`
        }
        return code
      }

      return
    },

    // also expose via transformIndexHtml
    transformIndexHtml: {
      handler: async () => {
        return [
          {
            tag: 'link',
            injectTo: 'head',
            attrs: {
              rel: 'stylesheet',
              href: VIRTUAL_SSR_CSS_HREF,
              'data-ssr-css': true,
            },
          },

          {
            tag: 'script',
            injectTo: 'head',
            attrs: { type: 'module' },
            children: /* js */ `
              import { createHotContext } from "/@vite/client";
              const hot = createHotContext("/__clear_ssr_css");
              hot.on("vite:afterUpdate", () => {
                document
                  .querySelectorAll("[data-ssr-css]")
                  .forEach(node => node.remove());
              });
            `,
          },
        ]
      },
    },
  } satisfies Plugin
}

function invalidateModule(server: ViteDevServer, id: string) {
  const mod = server.moduleGraph.getModuleById(id)
  if (mod) {
    server.moduleGraph.invalidateModule(mod)
  }
}

// style collection
// https://github.com/remix-run/remix/blob/1a8a5216106bd8c3073cc3e5e5399a32c981db74/packages/remix-dev/vite/styles.ts
// https://github.com/vikejs/vike/blob/f9a91f3c47cab9c2871526ef714cc0f87a41fda0/vike/node/runtime/renderPage/getPageAssets/retrieveAssetsDev.ts

export async function collectStyle(server: ViteDevServer, entries: string[]) {
  const urls = await collectStyleUrls(server, entries)
  const codes = await Promise.all(
    urls.map(async (url) => {
      const res = await server.transformRequest(url + '?direct')
      const code = res?.code || ''
      const prefix = `/* [collectStyle] ${url} */`

      try {
        const { transform } = await import('lightningcss')
        const buffer = Buffer.from(code)
        const codeOut = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)

        let processed = transform({
          filename: 'code.css',
          code: codeOut,
          ...server.config.css.lightningcss,
        }).code.toString()

        return [prefix, processed]
      } catch (err) {
        console.error(` [one] Error post-processing CSS, leaving un-processed: ${err}`)
        return [prefix, code]
      }
    })
  )

  let out = codes.flat().filter(Boolean).join('\n\n')

  if (process.env.ONE_DEBUG_CSS) {
    console.info(`Got CSS`, out)
  }

  if (process.env.ONE_DEDUPE_CSS) {
    out = dedupeCSS(out)
  }

  if (process.env.ONE_DEBUG_CSS) {
    console.info(`Got CSS after dedupe`, out)
  }

  return out
}

async function collectStyleUrls(server: ViteDevServer, entries: string[]): Promise<string[]> {
  const visited = new Set<string>()

  async function traverse(url: string) {
    const [, id] = await server.moduleGraph.resolveUrl(url)
    if (visited.has(id)) {
      return
    }
    visited.add(id)
    const mod = server.moduleGraph.getModuleById(id)
    if (!mod) {
      return
    }
    await Promise.all([...mod.importedModules].map((childMod) => traverse(childMod.url)))
  }

  // ensure vite's import analysis is ready _only_ for top entries to not go too aggresive
  await Promise.all(entries.map((e) => server.transformRequest(e)))

  // traverse
  await Promise.all(entries.map((url) => traverse(url)))

  // filter
  return [...visited].filter((url) => url.match(CSS_LANGS_RE))
}

// cf. https://github.com/vitejs/vite/blob/d6bde8b03d433778aaed62afc2be0630c8131908/packages/vite/src/node/constants.ts#L49C23-L50
const CSS_LANGS_RE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/

function dedupeCSS(css: string): string {
  // Regex to match CSS rule blocks: selector(s) { content }
  // Matches: selectors (conservative chars) followed by { content } with proper nesting
  const cssRuleRegex = /([^{}]+)\s*\{\s*([^{}]*(?:\{[^{}]*\}[^{}]*)*)\s*\}/g

  const uniqueBlocks = new Set<string>()
  const nonRuleContent: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  // Extract CSS rules and preserve non-rule content (comments, at-rules, etc.)
  while ((match = cssRuleRegex.exec(css)) !== null) {
    // Add any content before this rule
    const beforeRule = css.slice(lastIndex, match.index).trim()
    if (beforeRule) {
      nonRuleContent.push(beforeRule)
    }

    // Process the CSS rule
    const selector = match[1].trim()
    const content = match[2].trim()

    // Only process if it looks like a valid CSS rule (conservative selector chars)
    if (selector && /^[a-zA-Z0-9\s\-_.,#:@()\[\]"'*+>~^$|=]+$/.test(selector)) {
      const normalizedRule = `${selector} {\n  ${content.replace(/;\s*/g, ';\n  ')}\n}`
      uniqueBlocks.add(normalizedRule)
    }

    lastIndex = cssRuleRegex.lastIndex
  }

  // Add any remaining content after the last rule
  const afterRules = css.slice(lastIndex).trim()
  if (afterRules) {
    nonRuleContent.push(afterRules)
  }

  // Combine non-rule content with deduplicated rules
  const result = [...nonRuleContent, ...Array.from(uniqueBlocks)].filter(Boolean).join('\n\n')

  return result
}
