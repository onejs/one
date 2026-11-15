import { Component, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// the group draws the tree as SwiftUI disclosure rows inside a list. the row closure runs
// once per node and its content mounts as a row native finds by id. the toggle adds a
// child to a folder, which proves rows follow the data. the invalid leg stays unmounted
// until its pressable runs.
type Folder = { id: string; name: string; folders?: Folder[] | null }

const roots: Folder[] = [
  {
    id: 'docs',
    name: 'Documents',
    folders: [
      { id: 'reports', name: 'Reports', folders: [{ id: 'q3', name: 'Q3' }] },
      { id: 'notes', name: 'Notes' },
    ],
  },
  { id: 'photos', name: 'Photos' },
]

export default function OneNativeOutlineGroup() {
  const [extra, setExtra] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const data = extra
    ? roots.map((root) =>
        root.id === 'photos' ? { ...root, folders: [{ id: 'trip', name: 'Trip' }] } : root
      )
    : roots

  return (
    <View style={styles.screen} testID="one-native-outline-group-screen">
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-outline-group-add"
          onPress={() => setExtra(true)}
        >
          <Text style={styles.actionText}>Add child</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-outline-group-invalid"
          onPress={() => setInvalid(true)}
        >
          <Text style={styles.actionText}>Repeat id</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        <One.iOS.List listStyle="sidebar" testID="one-native-outline-group-list">
          <One.iOS.OutlineGroup data={data} childrenKey="folders">
            {(folder) => <One.iOS.Label label={folder.name} systemImage="folder" />}
          </One.iOS.OutlineGroup>
        </One.iOS.List>
      </View>
      {invalid ? (
        <Boundary testID="one-native-outline-group-id-error">
          <One.iOS.OutlineGroup
            data={[{ id: 'x', folders: [{ id: 'x' }] }] as Folder[]}
            childrenKey="folders"
          >
            {() => <One.iOS.Text text="row" />}
          </One.iOS.OutlineGroup>
        </Boundary>
      ) : null}
    </View>
  )
}

class Boundary extends Component<{ children: ReactNode; testID: string }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <View>
        <Text testID={this.props.testID} style={styles.statusText}>
          {`Error: ${this.state.error}`}
        </Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, gap: 8, backgroundColor: '#F5F5F7' },
  row: { flexDirection: 'row', gap: 5 },
  list: { height: 360 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  statusText: { color: '#17233A', fontSize: 11 },
})
