import type { ComponentProps } from 'react'
import { One } from 'one'
import { Text, View } from 'react-native'

type Row = {
  role: NonNullable<ComponentProps<typeof One.UI.Icon>['colorRole']>
  ios: string
  android: ComponentProps<typeof One.Android.Icon>['name']
  label: string
}

const rows: Row[] = [
  { role: 'primary', ios: 'house.fill', android: 'home', label: 'Home' },
  { role: 'secondary', ios: 'magnifyingglass', android: 'search', label: 'Search' },
  { role: 'tertiary', ios: 'bookmark.fill', android: 'bookmark', label: 'Saved' },
  { role: 'accent', ios: 'square.and.arrow.up', android: 'share', label: 'Share' },
  { role: 'danger', ios: 'trash.fill', android: 'delete', label: 'Delete' },
]

// each color role on a real system symbol: sf symbols on ios, material symbols on android.
export function IconScene() {
  return (
    <View
      style={{
        width: 300,
        borderRadius: 32,
        borderCurve: 'continuous',
        backgroundColor: 'white',
        paddingVertical: 10,
      }}
    >
      {rows.map((row, index) => (
        <View
          key={row.role}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 22,
            height: 56,
            borderTopWidth: index ? 0.5 : 0,
            borderColor: '#e2e8f0',
          }}
        >
          <View style={{ width: 28, alignItems: 'center' }}>
            <One.UI.Icon
              colorRole={row.role}
              icons={{
                ios: <One.iOS.Image systemName={row.ios} swiftStyle={{ fontSize: 24 }} />,
                android: <One.Android.Icon name={row.android} size={26} filled />,
              }}
            />
          </View>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '600' }}>{row.label}</Text>
          <Text style={{ fontSize: 14, color: '#94a3b8', fontFamily: 'Menlo' }}>{row.role}</Text>
        </View>
      ))}
    </View>
  )
}
