import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const items = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Fig', 'Grape', 'Kiwi', 'Lemon', 'Mango', 'Orange', 'Peach', 'Pear', 'Plum', 'Strawberry']

export default function OneNativeListSearchRefresh() {
  const [query, setQuery] = useState('')
  const [requested, setRequested] = useState(0)
  const [completed, setCompleted] = useState(0)
  const release = useRef<(() => void) | null>(null)
  const visible = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()))

  const refresh = async () => {
    setRequested((count) => count + 1)
    await new Promise<void>((resolve) => { release.current = resolve })
    release.current = null
    setCompleted((count) => count + 1)
  }

  return (
    <View style={styles.screen} testID="one-native-list-search-refresh-screen">
      <View style={styles.controls}>
        <Text testID="one-native-list-search-status">{`Query: ${query}`}</Text>
        <Text testID="one-native-list-refresh-status">{`Refresh: ${requested} started, ${completed} completed`}</Text>
        <Pressable testID="one-native-list-refresh-release" onPress={() => release.current?.()}>
          <Text>Complete refresh</Text>
        </Pressable>
        <Pressable testID="one-native-list-search-external" onPress={() => setQuery('pear')}>
          <Text>Search for pear</Text>
        </Pressable>
        <Pressable testID="one-native-list-search-clear" onPress={() => setQuery('')}>
          <Text>Clear search</Text>
        </Pressable>
      </View>
      <One.iOS.NavigationStack
        style={styles.list}
        swiftStyle={{
          navigationTitleWithText: 'Fruit search',
          searchable: { value: query, onChange: setQuery },
        }}
      >
        <One.iOS.List listStyle="plain" style={styles.list} swiftStyle={{ refreshable: refresh }}>
          {visible.map((item) => <One.iOS.Text key={item} text={item} />)}
        </One.iOS.List>
      </One.iOS.NavigationStack>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  controls: { gap: 8, paddingBottom: 12 },
  list: { flex: 1 },
})
