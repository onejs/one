import { Image, Text, View } from 'react-native'

export default function Attachments() {
  const inline = () => <>
    before
    <View style={{ width: 24, height: 30, backgroundColor: '#da3745' }} />
    between
    <Image source={require('../assets/swatch.png')} style={{ width: 40, height: 40 }} />
    after
  </>
  return <View style={{ flex: 1, padding: 32, backgroundColor: '#fff', gap: 24 }}>
    <Text style={{ fontSize: 28, color: '#162331' }}>AFTER: inline View and Image</Text>
    <Text style={{ fontSize: 24, color: '#162331' }}>{inline()}</Text>
    <Text style={{ fontSize: 24, color: '#162331', width: 160 }}>{inline()}</Text>
    <Text numberOfLines={1} style={{ fontSize: 24, color: '#162331', width: 90 }}>{inline()}</Text>
    <Text style={{ fontSize: 24, color: '#162331', width: 600, textAlign: 'right' }}>{inline()}</Text>
  </View>
}
