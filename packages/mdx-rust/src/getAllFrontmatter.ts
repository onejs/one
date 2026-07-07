import fs from 'node:fs'
import path from 'node:path'
import glob from 'fast-glob'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import { getHeadings } from './getHeadings'
import type { Frontmatter } from './types'
import { notifyFileRead } from './watchFile'

// frontmatter for every mdx file under `fromPath`, newest first. reads only the
// frontmatter, so it stays cheap over hundreds of files.
export const getAllFrontmatter = (fromPath: string): Frontmatter[] => {
  const paths = glob.sync(`${fromPath}/**/*.mdx`)
  return paths
    .map((filePath) => {
      notifyFileRead(filePath)
      const source = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(source)
      const slug = filePath
        .replace(`${fromPath.replaceAll('\\', '/')}/`, '')
        .replace('.mdx', '')
      return {
        ...data,
        slug,
        headings: getHeadings(source),
        readingTime: readingTime(content),
      } as Frontmatter
    })
    .sort(
      (a, b) =>
        Number(new Date(b.publishedAt || '')) - Number(new Date(a.publishedAt || ''))
    )
}
