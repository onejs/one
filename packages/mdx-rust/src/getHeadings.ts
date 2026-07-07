import GithubSlugger from 'github-slugger'
import type { Heading } from './types'

const getTitle = (source: string) => source.replace(/^#+\s+/, '').replace(/<.*>/, ' ')

// extract headings for a table of contents. ids match the slugs added by
// slugPlugin during compilation, so anchor links resolve.
export const getHeadings = (source: string): Heading[] => {
  const slugger = new GithubSlugger()
  return source
    .split('\n')
    .filter((x) => x.startsWith('#'))
    .map((x) => ({
      title: getTitle(x),
      priority: x.trim().split(' ')[0].length,
      id: slugger.slug(getTitle(x)),
    }))
}
