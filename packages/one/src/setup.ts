// FIXME: This will break the release build of the React Native app.
import { scan } from 'react-scan'

if (process.env.ONE_ENABLE_REACT_SCAN) {
  const val = JSON.parse(process.env.ONE_ENABLE_REACT_SCAN)
  scan(
    val === true
      ? {
          enabled: true,
          showToolbar: false,
        }
      : val
  )
}

// fixes bad import error in expo-modules-core
// without this you run into error loading web immediately
// where globalThis.expo is not defined
import 'expo-modules-core/build/createWebModule'
