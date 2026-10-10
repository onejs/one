import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeShareEmpty() {
  const [shareMode, setShareMode] = useState<'text' | 'text-url' | 'url'>('text')
  const [shareDisabled, setShareDisabled] = useState(false)
  const [emptyAction, setEmptyAction] = useState('none')

  return (
    <View style={styles.screen} testID="one-native-share-empty-screen">
      <Text>{`Share type: ${shareMode}`}</Text>
      <Text>{`Share disabled: ${shareDisabled}`}</Text>
      <Pressable testID="one-native-share-empty-type" onPress={() => setShareMode((value) => value === 'text' ? 'text-url' : value === 'text-url' ? 'url' : 'text')}>
        <Text>Toggle share type</Text>
      </Pressable>
      <Pressable testID="one-native-share-empty-disabled" onPress={() => setShareDisabled((value) => !value)}>
        <Text>Toggle share disabled</Text>
      </Pressable>
      <One.iOS.ShareLink
        disabled={shareDisabled}
        item={shareMode === 'text' ? 'shared from one-native' : 'https://onestack.dev'}
        itemType={shareMode === 'url' ? 'url' : 'text'}
        label="Share"
        message="sent by the one-native fixture"
        style={{ width: 160 }}
        testID="one-native-share-empty-share"
      />
      <Text>{`Empty action: ${emptyAction}`}</Text>
      <One.iOS.ContentUnavailableView
        actions={[{ id: 'retry', label: 'Retry' }, { id: 'dismiss', label: 'Dismiss' }]}
        description={emptyAction === 'retry' ? 'A new search is ready.' : 'Nothing has been indexed yet, so there is nothing to show.'}
        style={{ height: 260 }}
        systemImage="tray"
        testID="one-native-share-empty-empty"
        title={emptyAction === 'retry' ? 'Retry requested' : 'No Results'}
        onAction={setEmptyAction}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 90, gap: 12, backgroundColor: '#F5F5F7' },
})
