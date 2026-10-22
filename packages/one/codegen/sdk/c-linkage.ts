// these sdk modules declare c exports without c++ linkage guards. importing
// their unchanged headers as extern_c keeps their actual c abi under interop.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const FRAMEWORKS = ['CarPlay', 'GameController', 'AVFoundation', 'AuthenticationServices']

export function writeCLinkageModules(dir: string): string {
  mkdirSync(dir, { recursive: true })
  for (const framework of FRAMEWORKS) {
    mkdirSync(join(dir, framework), { recursive: true })
    writeFileSync(join(dir, framework, 'SDK.h'), `#import <${framework}/${framework}.h>\n`)
  }
  const path = join(dir, 'module.modulemap')
  writeFileSync(path, FRAMEWORKS.map((framework) => `module ${framework} [system] [extern_c] {
  umbrella header "${framework}/SDK.h"
  link framework "${framework}"
  export *
  module * { export * }
}
`).join('\n'))
  return path
}
