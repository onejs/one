import GithubSlugger from 'github-slugger'
import type { Heading } from './types'

// heading text as it renders: jsx elements dropped, inline code kept without
// backticks. matches the text slugPlugin slugs, so ids line up.
const getTitle = (source: string) =>
  source
    .replace(/^#+\s+/, '')
    .split('`')
    .map((part, i) => (i % 2 ? part : part.replace(/<[^>]*>/g, '')))
    .join('')

// extract headings for a table of contents. ids match the slugs added by
// slugPlugin during compilation, so anchor links resolve.
export const getHeadings = (source: string): Heading[] => {
  const slugger = new GithubSlugger()
  // skip lines inside fenced code, where `# comment` is not a heading
  let fence = ''
  return source
    .split('\n')
    .filter((x) => {
      const marker = x.trimStart().match(/^(`{3,}|~{3,})/)?.[1]
      if (marker) {
        if (!fence) fence = marker
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = ''
        return false
      }
      return !fence && /^#{1,6}\s/.test(x)
    })
    .map((x) => {
      const title = getTitle(x)
      return {
        title: title.trim(),
        priority: x.trim().split(' ')[0].length,
        id: slugger.slug(title),
      }
    })
}
