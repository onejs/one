import matter from 'gray-matter'
import readingTime from 'reading-time'
import { type HastPluginInput, type MdastPluginInput, mdxToJs } from 'satteri'
import expressiveCode, {
  type SatteriExpressiveCodeOptions,
} from 'satteri-expressive-code'
import { getHeadings } from './getHeadings'
import { processImageMeta } from './processImageMeta'
import { slugPlugin } from './slugPlugin'
import { tableWhitespacePlugin } from './tableWhitespacePlugin'
import type { Frontmatter, ImageMeta } from './types'

export type GetMDXOptions = {
  /** public directory for resolving image paths that start with `/` (default: ./public) */
  publicDir?: string
  /**
   * Expressive Code (Shiki) options: themes, frames, styleOverrides, plugins.
   * Pass `false` to skip syntax highlighting entirely. Defaults to the
   * `github-dark` theme.
   */
  expressiveCode?: SatteriExpressiveCodeOptions | false
  /** extra satteri mdast plugins, e.g. a hero/demo source injector */
  mdastPlugins?: MdastPluginInput[]
  /** extra satteri hast plugins */
  hastPlugins?: HastPluginInput[]
}

const DEFAULT_EC: SatteriExpressiveCodeOptions = { themes: ['github-dark'] }

// the Expressive Code plugin caches its Shiki renderer (themes + grammars) for
// its lifetime, so we reuse one instance per config across every getMDX call
// instead of paying the warmup on every file.
const ecByKey = new Map<string, ReturnType<typeof expressiveCode>>()
function getExpressiveCode(opts: SatteriExpressiveCodeOptions) {
  const key = (() => {
    try {
      return JSON.stringify(opts)
    } catch {
      return null
    }
  })()
  if (key == null) return expressiveCode(opts)
  let plugin = ecByKey.get(key)
  if (!plugin) {
    plugin = expressiveCode(opts)
    ecByKey.set(key, plugin)
  }
  return plugin
}

/**
 * Compile an MDX string to an evaluatable component module using satteri (Rust)
 * for parsing/compilation and Expressive Code (Shiki) for code highlighting.
 * Evaluate the returned `code` with `getMDXComponent` from `@vxrn/mdx-rust/client`.
 */
export async function getMDX(
  source: string,
  options: GetMDXOptions = {}
): Promise<{ frontmatter: Frontmatter; code: string }> {
  const { data, content } = matter(source)

  const ec =
    options.expressiveCode === false
      ? []
      : [getExpressiveCode(options.expressiveCode ?? DEFAULT_EC)]

  const { code } = await mdxToJs(source, {
    outputFormat: 'function-body',
    jsxImportSource: 'react',
    features: { gfm: true, smartPunctuation: true, frontmatter: true },
    mdastPlugins: [...(options.mdastPlugins ?? [])],
    hastPlugins: [slugPlugin, tableWhitespacePlugin, ...ec, ...(options.hastPlugins ?? [])],
  })

  let imageMeta: ImageMeta | undefined
  if (data.image && typeof data.image === 'string') {
    const meta = await processImageMeta(data.image, { publicDir: options.publicDir })
    if (meta) imageMeta = meta
  }

  return {
    frontmatter: {
      ...data,
      headings: getHeadings(source),
      readingTime: readingTime(content),
      imageMeta,
    } as Frontmatter,
    code,
  }
}
