import { useState } from 'react'
import { Swift } from '@vxrn/native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export default function OneNativeGroups() {
  const [refuse, setRefuse] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [groupTaps, setGroupTaps] = useState(0)
  const [page, setPage] = useState('a')
  const [pinTaps, setPinTaps] = useState(0)
  const [deleteTaps, setDeleteTaps] = useState(0)
  const [iconTaps, setIconTaps] = useState(0)

  return (
    <View style={styles.screen} testID="one-native-groups-screen">
      <View style={styles.row}>
        <Pressable
          testID="one-native-groups-refuse"
          style={[styles.chip, refuse && styles.chipOn]}
          onPress={() => setRefuse((value) => !value)}
        >
          <Text>{refuse ? 'Refusing' : 'Accepting'}</Text>
        </Pressable>
      </View>

      <Swift.DisclosureGroup
        label="Details"
        isExpanded={expanded}
        onIsExpandedChange={(value) => {
          if (!refuse) setExpanded(value)
        }}
      >
        <Swift.Text text="Hidden detail" />
      </Swift.DisclosureGroup>

      <Swift.ControlGroup>
        <Swift.Button
          label="Add"
          systemImage="plus"
          onPress={() => setGroupTaps((count) => count + 1)}
        />
        <Swift.Button
          label="Star"
          systemImage="star"
          onPress={() => setGroupTaps((count) => count + 1)}
        />
      </Swift.ControlGroup>

      <Swift.VStack>
        <Swift.Text text="Above" />
        <Swift.Divider />
        <Swift.Text text="Below" />
        <Swift.Link destination="https://example.com" label="Visit example" />
        <Swift.Group>
          <Swift.Text text="Grouped" />
        </Swift.Group>
        <Swift.Overlay alignment="topTrailing">
          <Swift.Image systemName="bell.fill" />
          <Swift.Overlay.Content>
            <Swift.Text text="3" />
          </Swift.Overlay.Content>
        </Swift.Overlay>
        <Swift.Button
          systemImage="star.fill"
          onPress={() => setIconTaps((count) => count + 1)}
        />
      </Swift.VStack>

      <Swift.Pager selection={page} onSelectionChange={setPage} style={styles.pager}>
        <Swift.Page id="a">
          <Text testID="one-native-pager-a">Page A</Text>
        </Swift.Page>
        <Swift.Page id="b">
          <Text testID="one-native-pager-b">Page B</Text>
        </Swift.Page>
        <Swift.Page id="c">
          <Text testID="one-native-pager-c">Page C</Text>
        </Swift.Page>
      </Swift.Pager>

      <Swift.List style={styles.list}>
        <Swift.Section>
          <Swift.SwipeActions>
            <Swift.Text text="Swipe me" />
            <Swift.SwipeActions.Actions edge="leading" allowsFullSwipe={false}>
              <Swift.Button
                label="Pin"
                systemImage="pin"
                onPress={() => setPinTaps((count) => count + 1)}
              />
            </Swift.SwipeActions.Actions>
            <Swift.SwipeActions.Actions edge="trailing">
              <Swift.Button
                label="Delete"
                systemImage="trash"
                buttonRole="destructive"
                onPress={() => setDeleteTaps((count) => count + 1)}
              />
            </Swift.SwipeActions.Actions>
          </Swift.SwipeActions>
        </Swift.Section>
      </Swift.List>

      <View style={styles.row}>
        <Text
          testID="one-native-groups-expanded"
          style={styles.line}
        >{`Expanded: ${expanded}`}</Text>
        <Text
          testID="one-native-groups-taps"
          style={styles.line}
        >{`Group taps: ${groupTaps}`}</Text>
        <Text
          testID="one-native-groups-pager"
          style={styles.line}
        >{`Pager: ${page}`}</Text>
        <Text
          testID="one-native-groups-pin"
          style={styles.line}
        >{`Pin taps: ${pinTaps}`}</Text>
        <Text
          testID="one-native-groups-delete"
          style={styles.line}
        >{`Delete taps: ${deleteTaps}`}</Text>
        <Text
          testID="one-native-groups-icon"
          style={styles.line}
        >{`Icon taps: ${iconTaps}`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 70, gap: 6, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  chipOn: { backgroundColor: '#cfe2ff' },
  pager: { height: 100 },
  list: { height: 150 },
  line: { fontSize: 14 },
})
