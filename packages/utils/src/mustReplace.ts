export function mustReplace(
  source: string,
  replacements: {
    find: string | RegExp
    replace: string
    optional?: boolean
  }[]
) {
  let sourceOut = source
  for (const { find, replace, optional } of replacements) {
    if (!optional) {
      const found = find instanceof RegExp ? find.test(sourceOut) : sourceOut.includes(find)
      if (!found) {
        throw new Error(`Substring or pattern "${find}" not found in the string.`)
      }
    }

    // Perform the replacement
    sourceOut = sourceOut.replace(find, replace)
  }
  return sourceOut
}
