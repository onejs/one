import { join } from 'node:path'

export function getCacheDir(root: string) {
  return join(root, 'node_modules', '.vxrn')
}
