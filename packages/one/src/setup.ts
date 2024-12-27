// FIXME: This will break the release build of the React Native app.
import { scan } from 'react-scan'

if (process.env.ONE_ENABLE_REACT_SCAN) {
  scan(JSON.parse(process.env.ONE_ENABLE_REACT_SCAN))
}

// fixes bad import error in expo-modules-core
// without this you run into error loading web immediately
// where globalThis.expo is not defined
import 'expo-modules-core/src/web/index.web.ts'
