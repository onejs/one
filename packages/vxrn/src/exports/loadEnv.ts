export async function loadEnv(mode: 'production' | 'development', root = process.cwd()) {
  const { loadEnv: loadEnvVite } = await import('vite')
  const serverEnv = loadEnvVite(mode, root, '')
  const clientEnv = loadEnvVite(mode, root, ['VITE', 'ONE_PUBLIC'])

  // define into process.env
  for (const key in serverEnv) {
    if (typeof process.env[key] === 'undefined') {
      process.env[key] = serverEnv[key]
    }
  }

  return {
    serverEnv,
    clientEnv,
    clientEnvDefine: Object.fromEntries(
      Object.entries(clientEnv).flatMap(([key, val]) => {
        const stringified = JSON.stringify(val)
        return [
          [`process.env.${key}`, stringified],
          [`import.meta.env.${key}`, stringified],
        ]
      })
    ),
  }
}
