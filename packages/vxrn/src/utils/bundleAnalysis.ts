import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'rolldown'

export async function bundleAnalysisPlugins(
  root: string,
  target: string
): Promise<Plugin[]> {
  if (process.env.ONE_BUNDLE_ANALYZE !== '1') return []
  const { bundleAnalyzerPlugin } = await import('rolldown/experimental')
  const fileName = 'one-' + target + '-analysis.json'
  return [
    bundleAnalyzerPlugin({ fileName }),
    {
      name: 'vxrn:save-bundle-analysis',
      generateBundle: {
        order: 'post',
        async handler(_, bundle) {
          const report = bundle[fileName]
          if (!report || report.type !== 'asset')
            this.error('Rolldown did not emit the requested bundle analysis')
          delete bundle[fileName]
          const directory = join(root, '.one', 'bundle-analysis')
          await mkdir(directory, { recursive: true })
          await writeFile(join(directory, target + '.json'), report.source)
        },
      },
    },
  ]
}
