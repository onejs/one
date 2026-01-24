import GithubSlugger from 'github-slugger'

const getTitle = (source: string) => source.replace(/^#+\s+/, '').replace(/<.*>/, ' ')

export const getHeadings = (source: string) => {
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
