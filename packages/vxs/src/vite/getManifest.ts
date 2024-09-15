import { createRoutesManifest } from '../server/createRoutesManifest'
import { globDir } from '../utils/globDir'

export function getManifest() {
  const routePaths = globDir('app')
  return createRoutesManifest(routePaths, {
    platform: 'web',
  })
}
