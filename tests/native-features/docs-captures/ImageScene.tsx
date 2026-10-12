import { One } from 'one'
import { Text, View } from 'react-native'

// fixed unsplash photos through picsum, sized at 3x their tiles.
const photo = (id: number, width: number, height: number) =>
  `https://picsum.photos/id/${id}/${width * 3}/${height * 3}`

const grid = [1018, 1025, 1039, 1043, 1069, 1080]

// a photo screen: one wide cover image over a grid, all remote urls. parents clip the
// corners because android does not apply borderRadius to the image view itself.
export function ImageScene() {
  return (
    <View
      style={{
        width: 300,
        height: 420,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
        paddingHorizontal: 17,
        paddingTop: 30,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 30, fontWeight: '800', paddingHorizontal: 4, marginBottom: 8 }}>
        Photos
      </Text>
      <View style={{ borderRadius: 18, overflow: 'hidden' }}>
        <One.UI.Image
          source={photo(1015, 266, 140)}
          resizeMode="cover"
          style={{ width: 266, height: 140 }}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {grid.map((id) => (
          <View key={id} style={{ borderRadius: 10, overflow: 'hidden' }}>
            <One.UI.Image
              source={photo(id, 86, 86)}
              resizeMode="cover"
              style={{ width: 86, height: 86 }}
            />
          </View>
        ))}
      </View>
    </View>
  )
}
