// nitrogen registers every hybrid object. a hybrid owned by a link set group compiles
// only with that group, so its registration is wrapped in the group's condition.
// run after nitrogen regenerates nitrogen/generated/ios.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gate, linkSetGroups } from './linkSet'

const directory = join(dirname(fileURLToPath(import.meta.url)), '..', 'nitrogen', 'generated', 'ios')

const wrap = (path: string, pattern: (hybrid: string) => RegExp) => {
  let text = readFileSync(path, 'utf8')
  for (const [group, { hybrids }] of Object.entries(linkSetGroups))
    for (const hybrid of hybrids) {
      const block = pattern(hybrid)
      if (!block.test(text)) throw new Error(`${path} has no ${hybrid} registration`)
      text = text.replace(block, (match) => `${gate([group], match.trimEnd())}\n`)
    }
  writeFileSync(path, text)
}

wrap(
  join(directory, 'OneAutolinking.swift'),
  (hybrid) =>
    new RegExp(
      `  public static func create${hybrid}\\(\\)[\\s\\S]*?  public static func is${hybrid}Recyclable\\(\\) -> Bool \\{\\n[^\\n]*\\n  \\}\\n`
    )
)
wrap(
  join(directory, 'OneAutolinking.mm'),
  (hybrid) =>
    new RegExp(
      `  HybridObjectRegistry::registerHybridObjectConstructor\\(\\n    "${hybrid}",[\\s\\S]*?\\n  \\);\\n`
    )
)
