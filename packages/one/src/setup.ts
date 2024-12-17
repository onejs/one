import { scan } from 'react-scan'

if (process.env.ONE_ENABLE_REACT_SCAN === 'true') {
  scan({
    enabled: true,
    log: true,
    showToolbar: true,
  })
}

// fixes bad import error in expo-modules-core
// without this you run into error loading web immediately
// where globalThis.expo is not defined
import 'expo-modules-core/build/createWebModule'
