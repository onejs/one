import URL from 'url-parse'

try {
  if (new URL('https://tamagui.dev/test').pathname !== '/test') {
    throw ``
  }
} catch {
  globalThis['URL'] = URL
}
