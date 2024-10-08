import babel from '@babel/core'
import { createRequire } from 'node:module'
import type { FilterPattern, PluginOption } from 'vite'
import { createFilter } from 'vite'

const require = createRequire(import.meta.url)

export async function transformFlow(
  input: string,
  { development = false }: { development?: boolean } = {}
) {
  return await new Promise<string>((res, rej) => {
    babel.transform(
      input,
      {
        presets: [
          [
            require.resolve('metro-react-native-babel-preset'),
            {
              // To use the `@babel/plugin-transform-react-jsx` plugin for JSX.
              useTransformReactJSXExperimental: true,
            },
          ],
        ],
        plugins: [
          ['@babel/plugin-transform-react-jsx', { development }],
          ['@babel/plugin-transform-private-methods', { loose: true }],
        ],
      },
      (err: any, result) => {
        if (!result || err) rej(err || 'no res')
        res(result!.code!)
      }
    )
  })
}

export type Options = {
  include?: FilterPattern
  exclude?: FilterPattern
}

export default function createFlowPlugin(opts?: Options): PluginOption {
  if (!opts?.include || (Array.isArray(opts.include) && opts.include.length === 0)) {
    return
  }

  const filter = createFilter(opts?.include, opts?.exclude)

  return {
    name: '@vxrn/vite-flow',
    enforce: 'pre',
    transform(code, id) {
      if (filter(id)) {
        return transformFlow(code)
      }
      return null
    },
  }
}
