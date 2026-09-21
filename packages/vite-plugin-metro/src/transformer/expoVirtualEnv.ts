import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * narrow optional Expo compatibility shared by the native worker and the
 * babel transformer, mirroring @expo/metro-config's transform worker: only
 * expo/virtual/env.js and .env files are special, and everything else
 * passes through untouched. apps without Expo installed never resolve or
 * load any Expo module: the virtual file cannot match without the expo
 * package, and .env files are left alone when the parser is absent.
 */

type ParseEnvFile = (src: string, isClient: boolean) => Record<string, string>

function loadExpoParseEnvFile(projectRoot: string): ParseEnvFile | null {
  try {
    const requireFromProject = createRequire(path.join(projectRoot, 'package.json'))
    const expoMetroConfigPkg = requireFromProject.resolve(
      '@expo/metro-config/package.json'
    )
    const dotEnvDevelopment = requireFromProject(
      path.join(
        path.dirname(expoMetroConfigPkg),
        'build',
        'transform-worker',
        'dot-env-development'
      )
    ) as { parseEnvFile?: ParseEnvFile }
    return dotEnvDevelopment?.parseEnvFile ?? null
  } catch {
    return null
  }
}

const virtualEnvPattern = /[\\/]expo[\\/]virtual[\\/]env\.js$/
const dotEnvPattern = /(^|[\\/])\.env(\.(local|(development|production)(\.local)?))?$/
const developmentEnvFiles = [
  '.env',
  '.env.development',
  '.env.local',
  '.env.development.local',
]

export function substituteExpoVirtualEnvSource({
  filename,
  src,
  projectRoot,
  dev,
  environment,
}: {
  filename: string
  src: string
  projectRoot: string
  dev: boolean | undefined
  environment: unknown
}): string {
  const isClientEnvironment = environment !== 'node' && environment !== 'react-server'

  // parsing the virtual env is client-only, on the server process.env is used directly.
  if (isClientEnvironment && virtualEnvPattern.test(filename)) {
    if (dev) {
      // variables are merged at runtime so HMR can pick up .env edits.
      // standard Metro's Node crawler does not index `.env` because the file
      // has no extension, so seed the module with the same public-only merge.
      // context modules override this snapshot when the active watcher exposes
      // the files, preserving Expo's live-update path.
      const fileEnv: Record<string, string> = {}
      const parseEnvFile = loadExpoParseEnvFile(projectRoot)
      if (parseEnvFile) {
        for (const file of developmentEnvFiles) {
          try {
            Object.assign(
              fileEnv,
              parseEnvFile(readFileSync(path.join(projectRoot, file), 'utf8'), true)
            )
          } catch (error) {
            if (
              typeof error === 'object' &&
              error !== null &&
              'code' in error &&
              error.code === 'ENOENT'
            ) {
              continue
            }
            throw error
          }
        }
      }
      const relativePath = path
        .relative(path.dirname(filename), projectRoot)
        .split(path.sep)
        .join('/')
      return `const dotEnvModules = require.context(${JSON.stringify(relativePath)},false,/^\\.\\/\\.env/);\n\nexport const env = { ...process.env, ...${JSON.stringify(fileEnv)}, ...${JSON.stringify(developmentEnvFiles)}.reduce((acc, file) => {\n  const key = './' + file;\n  return { ...acc, ...(dotEnvModules.keys().includes(key) ? dotEnvModules(key)?.default : {}) };\n}, {}) };`
    }
    // production inlines every value at its use site, so reaching this
    // module at all is a bug worth naming rather than silently undefined.
    return `\nexport const env = new Proxy({}, {\n  get(target, key) {\n    throw new Error(\`Attempting to access internal environment variable "\${key}" is not supported in production bundles. Environment variables should be inlined in production by Babel.\`);\n  },\n});`
  }

  if (dotEnvPattern.test(filename)) {
    // parse .env files to objects with Expo's own installed parser, keeping
    // public names only in client environments. without Expo there is
    // nothing to substitute: no preset generates the require.context import
    // that would load a .env module, so the source passes through exactly
    // as it did before this file existed.
    const parseEnvFile = loadExpoParseEnvFile(projectRoot)
    if (!parseEnvFile) {
      return src
    }
    return `export default ${JSON.stringify(parseEnvFile(src, isClientEnvironment))};`
  }

  return src
}
