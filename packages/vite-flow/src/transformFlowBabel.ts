import babel from '@babel/core'

export async function transformFlowBabel(
  input: string,
  { development = false }: { development?: boolean } = {}
) {
  return await new Promise<string>((res, rej) => {
    babel.transform(
      input,
      {
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
