import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { nativeOneMembers } from './oneNativeMembers'
import {
  IOS_LINK_SET_REPORT_ENV,
  assertLinkSet,
  oneDirectory,
  readCatalog,
} from '../../cli/iosLinkSet'
import {
  analyzeModule,
  catalogNames,
  emptyUsage,
  groupsForUsage,
  keyPattern,
  mightUseGroups,
} from '../../cli/iosLinkSetAnalysis'

// reads every module of the production ios bundle for the features of the iOS link
// set it uses, from the bundler's own module graph so third-party packages count.
// prebuild asks for the groups through a report file. a release xcode build checks
// them against the groups the pod compiled and fails when the binary lacks one.
export function iosLinkSetPlugin(): Plugin {
  return {
    name: 'one:ios-link-set',
    api: {
      // the analysis runs only on the production ios bundle
      vxrnNative: (context: { platform: string; dev: boolean }): Plugin =>
        context.platform === 'ios' && !context.dev
          ? analysisPlugin()
          : { name: 'one:ios-link-set' },
    },
  }
}

function analysisPlugin(): Plugin {
  const catalog = readCatalog()
  const sdk = JSON.parse(
    readFileSync(join(oneDirectory(), 'ios-bindings/manifest.json'), 'utf8')
  ) as { generation: string; frameworks: string[] }
  const sdkModules = new Set(sdk.frameworks)
  const { keys } = catalogNames(catalog)
  const keySet = new Set(keys.keys())
  const pattern = keyPattern(keySet)
  const own = [oneDirectory()]
  try {
    own.push(realpathSync(own[0]))
  } catch {}
  const usage = emptyUsage()
  const rewriteMembers = nativeOneMembers(
    join(oneDirectory(), 'dist/esm/one-shared.native.js')
  )
  const escapes: string[] = []

  return {
    name: 'one:ios-link-set',
    transform: {
      order: 'pre',
      handler(code, id) {
        const file = id.split('?')[0]
        if (file.startsWith('\0') || file.startsWith('virtual:')) return
        if (own.some((dir) => file.startsWith(dir + '/'))) return
        if (mightUseGroups(code, keySet, pattern))
          analyzeModule(code, file, keySet, usage)
        if (!/["'`]one["'`]/.test(code)) return
        return rewriteMembers(code, file, (reason) => escapes.push(`${file}: ${reason}`))
      },
    },
    generateBundle(_options, bundle) {
      const groups = groupsForUsage(usage, catalog)
      if ([...this.getModuleIds()].some((id) => this.getModuleInfo(id)?.meta.oneDOM)) {
        if (!groups.includes('web')) groups.push('web')
      }
      const frameworks = new Set<string>()
      const scan = (code: string) => {
        for (const match of code.matchAll(
          /["'`]([A-Za-z_][A-Za-z0-9_]*)_([a-f0-9]{16})["'`]/g
        )) {
          if (match[2] === sdk.generation && sdkModules.has(match[1]))
            frameworks.add(match[1])
        }
      }
      for (const output of Object.values(bundle))
        if (output.type === 'chunk') scan(output.code)
      // the One object spreads every namespace, so a framework also has to sit in a
      // module the app reaches without it. that holds while every app read of One was
      // rewritten to the module defining it and only one's entry imports the object.
      const dist = own.map((dir) => join(dir, 'dist/esm'))
      const oneObject = dist.flatMap((dir) =>
        ['one.native.js', 'one-shared.native.js'].map((name) => join(dir, name))
      )
      const entries = dist.map((dir) => join(dir, 'index.native.js'))
      if (
        !escapes.length &&
        !oneObject.some((id) =>
          this.getModuleInfo(id)?.importers.some(
            (importer) => !oneObject.includes(importer) && !entries.includes(importer)
          )
        )
      ) {
        const inBundle = new Set(frameworks)
        frameworks.clear()
        const seen = new Set(
          [...this.getModuleIds()].filter((id) => this.getModuleInfo(id)?.isEntry)
        )
        for (const id of seen) {
          const info = this.getModuleInfo(id)
          if (!info) continue
          if (info.code) scan(info.code)
          for (const next of [...info.importedIds, ...info.dynamicallyImportedIds])
            if (!oneObject.includes(next)) seen.add(next)
        }
        for (const name of frameworks) if (!inBundle.has(name)) frameworks.delete(name)
      }
      const sdkFrameworks = [...frameworks].sort()
      const report = process.env[IOS_LINK_SET_REPORT_ENV]
      if (report)
        writeFileSync(
          report,
          JSON.stringify({ groups, frameworks: sdkFrameworks }) + '\n'
        )
      assertLinkSet(groups, process.env, sdkFrameworks)
    },
  }
}
