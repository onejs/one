import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// the Android proof cannot reach WorkManager's dispatcher on demand, so this
// fixture-only hook exercises the registered JS delivery path the same way
// prepare-ios-background-tasks does: a nativefeatures://background-task URL
// intercepted in MainActivity calls the coordinator's DEBUG simulate methods
// instead of routing into React Native. release builds ignore them.
const activityPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../android/app/src/main/java/dev/vxrn/nativefeatures/tests/MainActivity.kt'
)

if (!existsSync(activityPath)) {
  throw new Error(
    'prepare-android-background-tasks: run one prebuild --platform android first so MainActivity.kt exists'
  )
}

const marker = 'one-background-task-hook'
let activity = readFileSync(activityPath, 'utf8')
if (!activity.includes(marker)) {
  const anchor = '    override fun onCreate(savedInstanceState: Bundle?) {'
  if (!activity.includes(anchor)) {
    throw new Error(
      'generated MainActivity changed; update the background-task fixture hook'
    )
  }
  if (!activity.includes('import android.content.Intent')) {
    activity = activity.replace(
      'import android.os.Bundle',
      'import android.content.Intent\nimport android.os.Bundle'
    )
  }
  if (!activity.includes('OneBackgroundTasksCoordinator')) {
    activity = activity.replace(
      'import com.margelo.nitro.one.OneLaunchScreen',
      'import com.margelo.nitro.one.OneBackgroundTasksCoordinator\nimport com.margelo.nitro.one.OneLaunchScreen'
    )
  }
  activity = activity.replace(
    anchor,
    `    // ${marker}: fixture-only DEBUG background-task injection, see
    // scripts/prepare-android-background-tasks.ts.
    private fun handleBackgroundTaskLink(intent: Intent?): Boolean {
        val data = intent?.data ?: return false
        if (data.scheme != "nativefeatures" || data.host != "background-task") return false
        when (data.path) {
            "/refresh" -> OneBackgroundTasksCoordinator.simulateLaunch("dev.vxrn.native.tests.refresh")
            "/processing" -> OneBackgroundTasksCoordinator.simulateLaunch("dev.vxrn.native.tests.processing")
            "/expire" -> OneBackgroundTasksCoordinator.simulateExpiration()
        }
        return true
    }

    override fun onNewIntent(intent: Intent) {
        // consumed fixture URLs never reach React Native navigation.
        if (handleBackgroundTaskLink(intent)) return
        super.onNewIntent(intent)
    }

${anchor}`
  )
  const created = '        super.onCreate(null)'
  if (!activity.includes(created)) {
    throw new Error(
      'generated MainActivity changed; update the background-task fixture hook'
    )
  }
  activity = activity.replace(
    created,
    `${created}
        handleBackgroundTaskLink(intent)`
  )
  writeFileSync(activityPath, activity)
}
