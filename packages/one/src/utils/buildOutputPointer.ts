import { dirname, join } from 'node:path'
import FSExtra from 'fs-extra'
import { toAbsolute } from './toAbsolute'

export const buildOutputPointerPath = join(
  'node_modules',
  '.cache',
  'one',
  'build-pointer.json'
)

type BuildOutputPointer = {
  outDir?: string
}

export async function writeBuildOutputPointer(outDir: string) {
  try {
    const pointerPath = toAbsolute(buildOutputPointerPath)
    await FSExtra.ensureDir(dirname(pointerPath))
    await FSExtra.writeJSON(pointerPath, { outDir })
  } catch {}
}

export async function resolveServeOutDir(outDir?: string) {
  if (outDir) {
    return outDir
  }

  if (FSExtra.existsSync('buildInfo.json')) {
    return '.'
  }

  try {
    const pointer = (await FSExtra.readJSON(
      buildOutputPointerPath
    )) as BuildOutputPointer

    if (
      pointer.outDir &&
      (await FSExtra.pathExists(join(pointer.outDir, 'buildInfo.json')))
    ) {
      return pointer.outDir
    }

    if (pointer.outDir) {
      console.warn(
        `[one serve] build-pointer.json points to '${pointer.outDir}/' but no buildInfo.json was found there. run \`one build\` to refresh the marker.`
      )
    }
  } catch {}

  return 'dist'
}
