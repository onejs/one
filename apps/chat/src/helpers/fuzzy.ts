import FlexSearch from 'flexsearch'

export function createFuzzy<A>(items: A[] | readonly A[], searchKey: keyof A) {
  const index = new FlexSearch.Index()

  for (const [idx, item] of items.entries()) {
    const haystack = item[searchKey]
    index.add(idx, haystack as string)
  }

  return {
    search: (val: string) => {
      return index.search(val).map((id) => {
        return items[+id]
      })
    },
  }
}
