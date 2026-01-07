import { bundleMDX } from 'mdx-bundler'
import readingTime from 'reading-time'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { getHeadings } from './getHeadings'
import { rehypeHighlightCode } from './rehypeHighlightCode'
import rehypeMetaAttribute from './rehypeMetaAttribute'
import type { Frontmatter, UnifiedPlugin } from './types'

export async function getMDX(source: string, extraPlugins?: UnifiedPlugin) {
  const { frontmatter, code } = await bundleMDX({
    source,
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? []), remarkGfm]
      const plugins = [
        ...(extraPlugins || []),
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

  return {
    frontmatter: {
      ...frontmatter,
      headings: getHeadings(source),
      readingTime: readingTime(code),
    } as Frontmatter,
    code,
  }
}
