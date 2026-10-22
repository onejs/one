// these sdk modules declare c exports without c++ linkage guards. importing
// their unchanged headers as extern_c keeps their actual c abi under interop.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const FRAMEWORKS = ['CarPlay', 'GameController', 'AVFoundation', 'AuthenticationServices']

// api notes live in the sdk frameworks, not beside our external modulemap.
// keep their swift names and private declarations required by the overlays.
export function cLinkageSwiftFlags(moduleMap: string, sdkRoot: string): string[] {
  return ['-Xcc', `-fmodule-map-file=${moduleMap}`, ...FRAMEWORKS.flatMap((framework) => [
    '-Xcc', '-iapinotes-modules', '-Xcc', join(sdkRoot, 'System/Library/Frameworks', `${framework}.framework/Headers`),
  ])]
}

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
