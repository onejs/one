import { realpathSync, writeFileSync } from 'node:fs'
import type { Plugin } from 'vite'
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
        context.platform === 'ios' && !context.dev ? analysisPlugin() : { name: 'one:ios-link-set' },
    },
  }
}

function analysisPlugin(): Plugin {
  const catalog = readCatalog()
  const { keys } = catalogNames(catalog)
  const keySet = new Set(keys.keys())
  const pattern = keyPattern(keySet)
  const own = [oneDirectory()]
  try {
    own.push(realpathSync(own[0]))
  } catch {}
  const usage = emptyUsage()

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
      },
    },
    buildEnd(error) {
      if (error) return
      const groups = groupsForUsage(usage, catalog)
      const report = process.env[IOS_LINK_SET_REPORT_ENV]
      if (report) writeFileSync(report, JSON.stringify({ groups }) + '\n')
      assertLinkSet(groups)
    },
  }
}
