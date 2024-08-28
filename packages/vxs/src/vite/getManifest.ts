import { createRoutesManifest } from '../server/createRoutesManifest'
import { globDir } from '../utils/globDir'

export function getManifest(root: string) {
  const routePaths = globDir(root)
  return createRoutesManifest(routePaths, {
    platform: 'web',
  })
}
