import { build as esbuild } from 'esbuild'

// problem... imports dont resolve
export async function postprocessCSS(
  input: string,
  {
    resolveDir = '.',
    sourcefile = 'collected.css',
  }: {
    resolveDir?: string
    sourcefile?: string
  } = {}
): Promise<string> {
  const result = await esbuild({
    plugins: [
      {
        name: 'ignoreAssets',
        setup(build) {
          // Intercept all paths that end with ".svg" and ignore them
          build.onResolve({ filter: /\.(svg|png|gif|jpe?g|webp)$/ }, (args) => {
            return { path: args.path, external: true }
          })
        },
      },
    ],
    stdin: {
      contents: input,
      resolveDir,
      sourcefile,
      loader: 'css',
    },
    target: 'safari17',
    bundle: true,
    sourcemap: false,
    write: false,
    loader: {
      '.css': 'css',
    },
  })

  if (result.errors.length) {
    console.error('Error processing CSS:', result.errors)
    throw new Error('Failed to process CSS: ' + JSON.stringify(result.errors, null, 2))
  }

  return result.outputFiles[0]?.text ?? ''
}
