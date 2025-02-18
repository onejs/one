import babel from '@babel/core'
import { resolvePath } from '@vxrn/resolve'
import { stat } from 'node:fs/promises'

export async function transformFlowBabel(
  input: string,
  { development = false }: { development?: boolean } = {}
) {
  let metroPresetPath = 'module:metro-react-native-babel-preset'

  try {
    // the above doesn't work in some monorepos so lets try resolving it specifically ourselves
    // has to be relative to this package as it is installed below it
    const attempt = resolvePath('metro-react-native-babel-preset', resolvePath('@vxrn/vite-flow'))
    if ((await stat(attempt)).isDirectory()) {
      metroPresetPath = attempt
    }
  } catch (err) {
    // fallback to original
  }

  return await new Promise<string>((res, rej) => {
    babel.transform(
      input,
      {
        filename: 'file.js', // this is required for @react-native/babel-plugin-codegen to work.
        presets: [
          [
            metroPresetPath,
            {
              // To use the `@babel/plugin-transform-react-jsx` plugin for JSX.
              useTransformReactJSXExperimental: true,
              unstable_transformProfile: 'hermes-stable',
            },
          ],
        ],
        plugins: [
          ['babel-plugin-syntax-hermes-parser'], // This parser is required for the `@babel/plugin-transform-react-jsx` plugin to work.
          ['@react-native/babel-plugin-codegen'], // Transforms thing like `export default (codegenNativeComponent<NativeProps>('DebuggingOverlay'));` into `export default NativeComponentRegistry.get(nativeComponentName, () => __INTERNAL_VIEW_CONFIG);`, we need to do this here since Flow types are required to generate that `__INTERNAL_VIEW_CONFIG`. Without this we'll get warnings/errors like "Codegen didn't run for DebuggingOverlay".
          ['@babel/plugin-transform-react-jsx', { development }],
          ['@babel/plugin-transform-private-methods', { loose: true }],
        ],
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
