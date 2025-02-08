import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

const PackageJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  main: z.string().optional(),
  scripts: z.record(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  private: z.boolean().optional(),
  type: z.enum(['module', 'commonjs']).optional(),
})

type PackageJson = z.infer<typeof PackageJsonSchema>

export async function readPackageJSON(dir: string): Promise<PackageJson> {
  try {
    const raw = await readFile(join(dir, 'package.json'), 'utf-8')
    const json = JSON.parse(raw)
    return PackageJsonSchema.parse(json)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read package.json: ${error.message}`)
    }
    throw error
  }
}
