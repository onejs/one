import fs from 'node:fs'
import path from 'node:path'
import compareVersions from 'compare-versions'
import { getMDX } from './getMDX'
import type { Frontmatter, UnifiedPlugin } from './types'

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
  const bundle = await getMDX(source, extraPlugins)
  return bundle
}

export function getAllVersionsFromPath(fromPath: string): string[] {
  if (!fs.existsSync(fromPath)) return []
  return fs
    .readdirSync(fromPath)
    .map((fileName) => fileName.replace('.mdx', ''))
    .sort(compareVersions)
    .reverse()
}
