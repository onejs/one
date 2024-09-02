import getDevServer from 'react-native/Libraries/Core/Devtools/getDevServer'

export function getDevServerUrl() {
  const { url } = getDevServer() as { url: string }
  return url.replace(/\/+$/, '') // remove trailing slash for consistency with web
}
