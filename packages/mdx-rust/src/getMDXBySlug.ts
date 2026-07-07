import fs from 'node:fs'
import path from 'node:path'
import compareVersions from 'compare-versions'
import { type GetMDXOptions, getMDX } from './getMDX'
import type { Frontmatter } from './types'
import { notifyFileRead } from './watchFile'

export const getMDXBySlug = async (
  basePath: string,
  slug: string,
  options?: GetMDXOptions
): Promise<{ frontmatter: Frontmatter; code: string }> => {
  let mdxPath = slug

  // if no version given, resolve to the latest
  if (!slug.includes('.') && basePath.includes('components')) {
    const versions = getAllVersionsFromPath(path.join(basePath, slug))
    mdxPath += `/${versions[0]}`
  }

  const filePath = path.join(basePath, `${mdxPath}.mdx`)
  notifyFileRead(filePath)
  const source = fs.readFileSync(filePath, 'utf8')
  return getMDX(source, options)
}

export function getAllVersionsFromPath(fromPath: string): string[] {
  if (!fs.existsSync(fromPath)) return []
  return fs
    .readdirSync(fromPath)
    .map((fileName) => fileName.replace('.mdx', ''))
    .sort(compareVersions)
    .reverse()
}
