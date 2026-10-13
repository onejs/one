import GithubSlugger from 'github-slugger'

const getTitle = (source: string) => source.replace(/^#+\s+/, '').replace(/<.*>/, ' ')

export const getHeadings = (source: string) => {
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
    .map((x) => ({
      title: getTitle(x),
      priority: x.trim().split(' ')[0].length,
      id: slugger.slug(getTitle(x)),
    }))
}
