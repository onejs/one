import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
      const found =
        find instanceof RegExp ? find.test(sourceOut) : sourceOut.includes(find)
      if (!found) {
        const tmpPath = join(tmpdir(), `replace-error-${Math.random()}`)
        writeFileSync(tmpPath, sourceOut, 'utf-8')
        throw new Error(
          `Substring or pattern "${find}" not found in the string, replacing in source: ${tmpPath}.`
        )
      }
    }

    // Perform the replacement
    sourceOut = sourceOut.replace(find, replace)
  }
  return sourceOut
}
