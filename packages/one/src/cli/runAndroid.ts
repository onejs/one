import { loadUserOneOptions } from '../vite/loadConfig'

export async function run(args: {}) {
  const { runAndroid } = await import('vxrn')

  // resolve the app's dev server port from its vite config so the launched
  // app points at the real dev server (vxrn passes it as the community cli
  // --port with --no-packager, which reuses the already-running server)
  const options = await loadUserOneOptions('serve', true).catch(() => null)

  await runAndroid({
    root: process.cwd(),
    port: options?.config?.config?.server?.port,
  })
}
