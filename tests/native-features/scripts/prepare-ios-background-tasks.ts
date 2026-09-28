import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// the simulator cannot launch BGTaskScheduler jobs through Apple's debugger
// hook. this fixture-only URL exercises the registered JS delivery path.
const scenePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../ios/NativeFeatureTests/SceneDelegate.swift'
)
let scene = readFileSync(scenePath, 'utf8')
const marker = 'if url.scheme == "nativefeatures", url.host == "background-task" {'
if (!scene.includes(marker)) {
  const openPoint = '    guard let url = URLContexts.first?.url else { return }\n'
  if (!scene.includes(openPoint)) {
    throw new Error('generated SceneDelegate changed; update the background-task fixture hook')
  }
  scene = scene.replace(openPoint, `${openPoint}    #if DEBUG
    ${marker}
      switch url.path {
      case "/refresh":
        OneBackgroundTasksSimulateLaunch("dev.vxrn.native.tests.refresh")
      case "/processing":
        OneBackgroundTasksSimulateLaunch("dev.vxrn.native.tests.processing")
      case "/expire":
        OneBackgroundTasksSimulateExpiration()
      default:
        break
      }
      return
    }
    #endif
`)
  writeFileSync(scenePath, scene)
}
