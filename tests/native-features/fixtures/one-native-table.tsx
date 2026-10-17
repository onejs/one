import { Component, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// the table draws every cell React rendered, one per row and column. SwiftUI shows only the
// first column on iPhone, so the sort button drives the controlled sort prop and re-sorts
// the rows the way a header tap on iPad would. the invalid leg stays unmounted until its
// pressable runs.
type Person = { id: string; name: string; age: number }

const people: Person[] = [
  { id: 'ada', name: 'Ada', age: 36 },
  { id: 'bo', name: 'Bo', age: 29 },
  { id: 'cy', name: 'Cy', age: 41 },
]
const columns = [
  { id: 'name', title: 'Name' },
  { id: 'age', title: 'Age' },
]

export default function OneNativeTable() {
  const [descending, setDescending] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [tapped, setTapped] = useState('none')
  const rows = descending ? [...people].reverse() : people

  return (
    <View style={styles.screen} testID="one-native-table-screen">
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-table-descending"
          onPress={() => setDescending(true)}
        >
          <Text style={styles.actionText}>Name descending</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-table-invalid"
          onPress={() => setInvalid(true)}
        >
          <Text style={styles.actionText}>Repeat column</Text>
        </Pressable>
        <Text style={styles.statusText} testID="one-native-table-status">
          {`sort: ${descending ? 'name descending' : 'name ascending'}, tapped: ${tapped}`}
        </Text>
      </View>
      <View style={styles.table}>
        <One.iOS.Table
          data={rows}
          columns={columns}
          sort={{ column: 'name', direction: descending ? 'descending' : 'ascending' }}
          onSortChange={(sort) => setTapped(`${sort.column} ${sort.direction}`)}
          testID="one-native-table-table"
        >
          {(person, column) => (
            <One.iOS.Text text={column.id === 'age' ? String(person.age) : person.name} />
          )}
        </One.iOS.Table>
      </View>
      {invalid ? (
        <Boundary testID="one-native-table-column-error">
          <One.iOS.Table
            data={people}
            columns={[
              { id: 'a', title: 'A' },
              { id: 'a', title: 'B' },
            ]}
          >
            {() => <One.iOS.Text text="cell" />}
          </One.iOS.Table>
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
  row: { flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap' },
  table: { height: 280 },
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
