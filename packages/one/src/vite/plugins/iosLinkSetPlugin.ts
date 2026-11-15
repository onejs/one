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

  return {
    name: 'one:ios-link-set',
    transform: {
      order: 'pre',
      handler(code, id) {
        const file = id.split('?')[0]
        if (file.startsWith('\0') || file.startsWith('virtual:')) return
        if (own.some((dir) => file.startsWith(dir + '/'))) return
        if (!mightUseGroups(code, keySet, pattern)) return
        analyzeModule(code, file, keySet, usage)
        return rewriteMembers(code, file)
      },
    },
    generateBundle(_options, bundle) {
      const groups = groupsForUsage(usage, catalog)
      if ([...this.getModuleIds()].some((id) => this.getModuleInfo(id)?.meta.oneDOM)) {
        if (!groups.includes('web')) groups.push('web')
      }
      const frameworks = new Set<string>()
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        for (const match of output.code.matchAll(
          /["'`]([A-Za-z_][A-Za-z0-9_]*)_([a-f0-9]{16})["'`]/g
        )) {
          if (match[2] === sdk.generation && sdkModules.has(match[1]))
            frameworks.add(match[1])
        }
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
