import { bundleMDX } from 'mdx-bundler'
import readingTime from 'reading-time'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { getHeadings } from './getHeadings'
import { processImageMeta } from './processImageMeta'
import { rehypeHighlightCode } from './rehypeHighlightCode'
import rehypeMetaAttribute from './rehypeMetaAttribute'
import type { Frontmatter, ImageMeta, UnifiedPlugin } from './types'

export type GetMDXOptions = {
  extraPlugins?: UnifiedPlugin
  /** Public directory for resolving image paths starting with / (default: ./public) */
  publicDir?: string
}

export async function getMDX(
  source: string,
  extraPluginsOrOptions?: UnifiedPlugin | GetMDXOptions
) {
  // Handle both old signature (extraPlugins) and new options object
  const opts: GetMDXOptions =
    Array.isArray(extraPluginsOrOptions)
      ? { extraPlugins: extraPluginsOrOptions }
      : extraPluginsOrOptions ?? {}

  const { frontmatter, code } = await bundleMDX({
    source,
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? []), remarkGfm]
      const plugins = [
        ...(opts.extraPlugins || []),
        ...(options.rehypePlugins ?? []),
        rehypeMetaAttribute,
        rehypeHighlightCode,
        rehypeAutolinkHeadings,
        rehypeSlug,
      ]
      options.rehypePlugins = plugins as any
      return options
    },
  })

  // Process image metadata if frontmatter.image exists
  let imageMeta: ImageMeta | undefined
  if (frontmatter.image && typeof frontmatter.image === 'string') {
    const meta = await processImageMeta(frontmatter.image, { publicDir: opts.publicDir })
    if (meta) {
      imageMeta = meta
    }
  }

  return {
    frontmatter: {
      ...frontmatter,
      headings: getHeadings(source),
      readingTime: readingTime(code),
      imageMeta,
    } as Frontmatter,
    code,
  }
}
