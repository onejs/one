export function mustReplace(
  source: string,
  replacements: {
    find: string | RegExp
    replace: string
  }[]
) {
  for (const { find, replace } of replacements) {
    const found = find instanceof RegExp ? find.test(source) : source.includes(find)
    if (!found) {
      throw new Error(`Substring or pattern "${find}" not found in the string.`)
    }

    // Perform the replacement
    source = source.replace(find, replace)
  }
}
