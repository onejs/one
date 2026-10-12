import { useEffect, useRef, useState } from 'react'
import { Platform, Text, View } from 'react-native'
import { One } from 'one'
import { Results, assert, useResults } from './realapps-api-report'

export default function PlatformAPIs() {
  const { results, report, run } = useResults([
    'One.platform',
    Platform.OS === 'ios' ? 'One.iOS.WebView' : 'One.Android.Icon',
  ])
  const [message, setMessage] = useState('waiting for native control')
  const measured = useRef(false)
  useEffect(() => {
    void run('One.platform', () => {
      assert(One.platform === Platform.OS, 'platform disagrees with native runtime', {
        actual: One.platform,
        expected: Platform.OS,
      })
      return One.platform
    })
  }, [run])
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Native platform: {One.platform}</Text>
      {Platform.OS === 'ios' ? (
        <One.iOS.WebView
          style={{ height: 180, width: '100%' }}
          html={
            '<html><meta name="viewport" content="width=device-width, initial-scale=1"><body><button onclick="window.ReactNativeWebView.postMessage(\'one-realapps-webview\')">WebView bridge probe</button></body></html>'
          }
          onMessage={(value) => {
            void run('One.iOS.WebView', () => {
              assert(
                value === 'one-realapps-webview',
                'unexpected webview message',
                value
              )
              setMessage('WebView message passed')
              return { message: value, action: 'tapped rendered HTML button' }
            })
          }}
          onError={(error) => report('One.iOS.WebView', 'failed', error)}
        />
      ) : (
        <One.Android.Icon
          name="folder_open"
          testID="realapps-platform-icon"
          style={{ width: 48, height: 48 }}
          onLayout={({ nativeEvent: { layout } }) => {
            if (measured.current) return
            measured.current = true
            void run('One.Android.Icon', () => {
              assert(
                layout.width > 0 && layout.height > 0,
                'native icon has no layout',
                layout
              )
              setMessage('Android icon mounted')
              return {
                layout,
                name: 'folder_open',
                scope: 'native Compose icon mount and layout',
              }
            })
          }}
        />
      )}
      <Text>{message}</Text>
      <Results results={results} />
    </View>
  )
}
