// the M1 proof app: nested views with colors and borders, and several texts
const React = require('react')
const { AppRegistry, View, Text } = require('react-native')

const swatches = ['#e5484d', '#f5a524', '#30a46c', '#0091ff', '#8e4ec6']

function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f4f1ea', padding: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: '700', color: '#1f1d1a' }}>One on Linux</Text>
      <Text style={{ fontSize: 16, color: '#5f5a50', marginTop: 4, marginBottom: 20 }}>
        React Native views mounted into GTK 4 widgets, text laid out with Pango.
      </Text>

      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {swatches.map((color, index) => (
          <View
            key={color}
            style={{
              width: 64,
              height: 64,
              marginRight: 12,
              borderRadius: index * 8,
              backgroundColor: color,
              borderWidth: 2,
              borderColor: '#1f1d1a',
            }}
          />
        ))}
      </View>

      <View
        style={{
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#cfc8b8',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#0091ff' }}>Nested card</Text>
        <View style={{ height: 8, backgroundColor: '#d7ecff', borderRadius: 4, marginVertical: 12 }} />
        <Text style={{ fontSize: 14, lineHeight: 22, color: '#3b372f' }}>
          Text wraps at the card's width, with a fixed line height, so a longer paragraph shows how
          measurement and painting agree on where each line breaks.
        </Text>
        <Text style={{ fontSize: 14, fontStyle: 'italic', textDecorationLine: 'underline', marginTop: 8 }}>
          Italic and underlined
        </Text>
        <Text style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginTop: 8, color: '#8e4ec6' }}>
          Uppercase with letter spacing
        </Text>
      </View>

      <View style={{ flex: 1 }} />
      <Text style={{ fontSize: 12, textAlign: 'right', color: '#8b8576' }}>embedded Hermes bytecode</Text>
    </View>
  )
}

AppRegistry.registerComponent('main', () => App)
