import babel from '@babel/core'
import { resolvePath } from '@vxrn/resolve'
import { stat } from 'node:fs/promises'

export async function transformFlowBabel(
  input: string,
  { development = false, path }: { development?: boolean; path?: string } = {}
) {
  let babelPreset = 'module:@react-native/babel-preset'

  try {
    // the above doesn't work in some monorepos so lets try resolving it specifically ourselves
    // has to be relative to this package as it is installed below it
    const attempt = resolvePath('@react-native/babel-preset')
    if ((await stat(attempt)).isDirectory()) {
      babelPreset = attempt
    }
  } catch (err) {
    // fallback to original
  }

  return await new Promise<string>((res, rej) => {
    babel.transform(
      input,
      {
        filename: path || 'file.js',
        presets: [babelPreset],
        plugins: [],
      },
      (err: any, result) => {
        if (!result || err) {
          return rej(err || 'no res')
        }
        res(result!.code!)
      }
    )
  })
}
