import { One } from 'one'
import { Text, View } from 'react-native'

const albums = [
  { title: 'Evening Tide', artist: 'The Harbor Lights', color: '#5856D6' },
  { title: 'Paper Moons', artist: 'Lumen', color: '#FF9500' },
  { title: 'Northbound', artist: 'Cass & Ivy', color: '#34C759' },
  { title: 'Glass Garden', artist: 'Mira Vale', color: '#FF2D55' },
]

// a music app in a rounded frame: a swiftui tab view with a badge, a search tab, and a
// bottom accessory above the bar.
export function IosTabsScene() {
  return (
    <View
      style={{
        width: 340,
        height: 600,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      <One.iOS.Tabs selection="home" onSelectionChange={() => {}}>
        <One.iOS.Tab id="home" title="Home" systemImage="house.fill">
          <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 36, paddingHorizontal: 20, gap: 14 }}>
            <Text style={{ fontSize: 30, fontWeight: '700' }}>Listen Now</Text>
            {albums.map((album) => (
              <View key={album.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: album.color }} />
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>{album.title}</Text>
                  <Text style={{ fontSize: 14, color: '#8E8E93' }}>{album.artist}</Text>
                </View>
              </View>
            ))}
          </View>
        </One.iOS.Tab>
        <One.iOS.Tab id="new" title="New" systemImage="square.grid.2x2.fill" badge={3}>
          <View />
        </One.iOS.Tab>
        <One.iOS.Tab id="library" title="Library" systemImage="music.note.list">
          <View />
        </One.iOS.Tab>
        <One.iOS.Tab id="search" title="Search" systemImage="magnifyingglass" role="search">
          <View />
        </One.iOS.Tab>
        <One.iOS.TabViewBottomAccessory>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
            <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#5856D6' }} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600' }}>Evening Tide</Text>
            <One.iOS.Image systemName="pause.fill" swiftStyle={{ fontSize: 18 }} />
          </View>
        </One.iOS.TabViewBottomAccessory>
      </One.iOS.Tabs>
    </View>
  )
}
