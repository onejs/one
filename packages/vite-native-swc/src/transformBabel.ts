import babel from '@babel/core'

/**
 * Transform input to mostly ES5 compatible code, keep ESM syntax, and transform generators.
 */
export async function transformGenerators(
  input: string,
  { development = false }: { development?: boolean } = {}
) {
  return await new Promise<string>((res, rej) => {
    babel.transform(
      input,
      {
        filename: 'code.js',
        plugins: [
          ['@babel/plugin-transform-destructuring'],
          ['@babel/plugin-transform-react-jsx', { development }],
          ['@babel/plugin-transform-regenerator'], // Transform generator functions
        ],
        compact: false,
        minified: false,
      },
      (err: any, result) => {
        if (!result || err) rej(err || 'no res')
        res(result!.code!)
      }
    )
  })
}
