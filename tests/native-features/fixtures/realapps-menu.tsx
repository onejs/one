import { router, useSafeAreaInsets } from 'one'
import { type PropsWithChildren } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'

export default function RealAppsMenu({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets()
  if (Platform.OS === 'web') return children
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
      <View
        style={{
          flexDirection: 'row',
          padding: 12,
          paddingBottom: insets.bottom + 12,
          gap: 12,
        }}
      >
        {['stack', 'tabs', 'drawer', 'api'].map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            testID={`realapps-open-${name}`}
            onPress={() =>
              router.push(
                (name === 'api' ? '/realapps-api' : `/realapps-routing/${name}`) as any
              )
            }
          >
            <Text>{name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
