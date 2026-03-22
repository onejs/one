// Isolated to suppress deprecation warning for deep import
// React Native 0.81+ discourages deep imports but doesn't provide official alternative yet
import getDevServerDefault from 'react-native/Libraries/Core/Devtools/getDevServer'

// handle CJS/ESM interop — Metro may wrap the default export in a module object
export const getDevServer: () => { url: string; bundleLoadedFromServer: boolean } =
  typeof getDevServerDefault === 'function'
    ? getDevServerDefault
    : ((getDevServerDefault as any).default ?? getDevServerDefault)
