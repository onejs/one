import { Text, View } from 'react-native'
import WebView from 'react-native-webview'

const filename = import.meta.dirname + '/static.html'
console.log('filename', filename)

export default () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Welcome to VXS</Text>
    <Text>Welcome to VXS</Text>
    <Text>Welcome to VXS</Text>
    <Text>Welcome to VXS</Text>

    <WebView
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
      }}
      source={{
        uri: './static.html',
      }}
      originWhitelist={['*']}
    />
  </View>
)
