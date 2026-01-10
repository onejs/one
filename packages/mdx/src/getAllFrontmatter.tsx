import fs from 'node:fs'
import path from 'node:path'
import glob from 'fast-glob'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import { getHeadings } from './getHeadings'
import type { Frontmatter } from './types'
import { notifyFileRead } from './watchFile'

// the front matter and content of all mdx files based on `docsPaths`
export const getAllFrontmatter = (fromPath: string): Frontmatter[] => {
  const paths = glob.sync(`${fromPath}/**/*.mdx`)
  return paths
    .map((filePath) => {
      const absolutePath = path.join(filePath)
      notifyFileRead(absolutePath)
      const source = fs.readFileSync(absolutePath, 'utf8')
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
