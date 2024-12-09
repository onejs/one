import babel from '@babel/core'

export async function transformFlowBabel(
  input: string,
  { development = false }: { development?: boolean } = {}
) {
  return await new Promise<string>((res, rej) => {
    babel.transform(
      input,
      {
        filename: 'file.js', // this is required for @react-native/babel-plugin-codegen to work.
        presets: [
          [
            'module:metro-react-native-babel-preset',
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
        if (!result || err) rej(err || 'no res')
        res(result!.code!)
      }
    )
  })
}
