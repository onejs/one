import fs from 'node:fs'
import path from 'node:path'
import compareVersions from 'compare-versions'
import { bundleMDX } from 'mdx-bundler'
import readingTime from 'reading-time'
import type { Frontmatter } from './types'
import { rehypeHighlightCode } from './rehypeHighlightCode'
import rehypeMetaAttribute from './rehypeMetaAttribute'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import { getHeadings } from './getHeadings'

export type UnifiedPlugin = import('unified').Plugin[]

export const getMDXBySlug = async (
  basePath: string,
  slug: string,
  extraPlugins?: UnifiedPlugin
): Promise<{ frontmatter: Frontmatter; code: string }> => {
  let mdxPath = slug

  // if no version given, find it
  if (!slug.includes('.') && basePath.includes('components')) {
    const versions = getAllVersionsFromPath(path.join(basePath, slug))
    mdxPath += `/${versions[0]}`
  }

  const filePath = path.join(basePath, `${mdxPath}.mdx`)
  const source = fs.readFileSync(filePath, 'utf8')
  const { frontmatter, code } = await getMDX(source, extraPlugins)
  return {
    frontmatter: {
      ...frontmatter,
      headings: getHeadings(source),
      readingTime: readingTime(code),
    } as Frontmatter,
    code,
  }
}

export async function getMDX(source: string, extraPlugins?: UnifiedPlugin) {
  return await bundleMDX({
    source,
    mdxOptions(options) {
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
}

export function getAllVersionsFromPath(fromPath: string): string[] {
  if (!fs.existsSync(fromPath)) return []
  return fs
    .readdirSync(fromPath)
    .map((fileName) => fileName.replace('.mdx', ''))
    .sort(compareVersions)
    .reverse()
}
