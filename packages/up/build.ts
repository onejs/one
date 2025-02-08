import esbuild from 'esbuild'

async function main() {
  const watch = process.argv.includes('--watch')

  const buildOptions = {
    entryPoints: ['./src/index.tsx'],
    outdir: 'dist',
    outExtension: {
      '.js': '.cjs',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'esnext',
    external: ['dockerode', 'mono-layout/wasm', 'yogini/wasm', 'vscode-oniguruma', 'node-pty'],
    sourcemap: true,
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
    },
  } satisfies esbuild.BuildOptions

  if (watch) {
    const context = await esbuild.context(buildOptions)
    await context.watch()
    console.info('Watching...')

    // Handle process exit
    process.on('SIGTERM', async () => {
      await context.dispose()
      process.exit(0)
    })
  } else {
    await esbuild.build(buildOptions)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
