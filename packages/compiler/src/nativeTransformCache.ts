import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import esbuildPackage from 'esbuild/package.json' with { type: 'json' }
import swcPackage from '@swc/core/package.json' with { type: 'json' }
import oxcPackage from 'oxc-transform/package.json' with { type: 'json' }
import compilerPackage from '@vxrn/compiler/package.json' with { type: 'json' }

type Result = { code: string; map?: any } | undefined
const engine = JSON.stringify([
  2,
  compilerPackage.version,
  esbuildPackage.version,
  swcPackage.version,
  oxcPackage.version,
])

export async function cachedNativeTransform(
  stage: string,
  filename: string,
  code: string,
  options: unknown,
  transform: () => Promise<Result>
): Promise<Result> {
  const key = createHash('sha256')
    .update(engine)
    .update(JSON.stringify([stage, filename, options]))
    .update(code)
    .digest('hex')
  const directory =
    process.env.ONE_NATIVE_TRANSFORM_CACHE_DIR ??
    join(process.cwd(), 'node_modules', '.cache', 'one', 'native-transforms')
  const file = join(directory, key + '.json')
  try {
    const cached: unknown = JSON.parse(await readFile(file, 'utf8'))
    if (cached === null) return
    if (
      cached &&
      typeof cached === 'object' &&
      'code' in cached &&
      typeof cached.code === 'string'
    )
      return { code: cached.code, map: 'map' in cached ? cached.map : undefined }
  } catch (error) {
    if (
      !(error instanceof SyntaxError) &&
      !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
    )
      throw error
  }
  const result = await transform()
  await mkdir(directory, { recursive: true })
  const temporary = file + '.' + process.pid + '.' + Math.random().toString(36).slice(2)
  await writeFile(temporary, JSON.stringify(result ?? null))
  await rename(temporary, file)
  return result
}
