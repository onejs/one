import { prepareIosSceneFixture } from './prepare-ios-scene'

// the simulator cannot launch BGTaskScheduler jobs through Apple's debugger
// hook. this fixture-only URL exercises the registered JS delivery path.
const marker = 'if url.scheme == "nativefeatures", url.host == "background-task" {'
prepareIosSceneFixture({
  marker,
  handler: `      #if DEBUG
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
      #endif`,
})
