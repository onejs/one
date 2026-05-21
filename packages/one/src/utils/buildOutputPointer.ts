import { dirname, join } from 'node:path'
import FSExtra from 'fs-extra'
import { toAbsolute } from './toAbsolute'

// stored under the project cwd; one build and one serve should run from the same root.
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
  } catch (err) {
    // surface the failure so `one serve` doesn't later fall back to `dist/`
    // with no breadcrumb when a custom outDir was used.
    console.warn(
      `[one build] could not write build-output pointer (${buildOutputPointerPath}). \`one serve\` will fall back to 'dist/' unless you pass --outDir.`,
      err instanceof Error ? err.message : err
    )
  }
}

export async function resolveServeOutDir(outDir?: string) {
  if (outDir) {
    return outDir
  }

  if (FSExtra.existsSync('buildInfo.json')) {
    return '.'
  }

  // ENOENT here is the common case (no pointer written yet); only warn on
  // unexpected read errors.
  let pointer: BuildOutputPointer | undefined
  try {
    pointer = (await FSExtra.readJSON(buildOutputPointerPath)) as BuildOutputPointer
  } catch (err: any) {
    if (err?.code && err.code !== 'ENOENT') {
      console.warn(
        `[one serve] could not read build-output pointer (${buildOutputPointerPath}):`,
        err.message ?? err
      )
    }
  }

  if (pointer?.outDir) {
    if (await FSExtra.pathExists(join(pointer.outDir, 'buildInfo.json'))) {
      return pointer.outDir
    }
    console.warn(
      `[one serve] build-pointer.json points to '${pointer.outDir}/' but no buildInfo.json was found there. run \`one build\` to refresh the marker.`
    )
  }

  if (!FSExtra.existsSync('dist/buildInfo.json')) {
    console.warn(
      `[one serve] no build-output pointer and no 'dist/buildInfo.json'. did \`one build\` run from this cwd? pass --outDir to point at the build output.`
    )
  }

  return 'dist'
}
