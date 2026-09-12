// geometry oracle fixture for the SwiftUI floating tab bar. every number rnx pins its
// FloatingTabBar against is measured off captures of this screen, so the screen exists to be
// photographed rather than tapped:
//
//  - Swift.Tabs fills the window with no padding and no bordered container, so an x measured
//    here is a real screen coordinate. the one-native screen wraps its tabs in a 16pt padded
//    card, which shifts every edge and shrinks the width SwiftUI lays the bar out in.
//  - the page behind the bar is one flat saturated colour. the capsule is a translucent glass
//    material, so over the white page card it lands within two luminance levels of the page and
//    only a shadow-then-rim trace can find its edges. over ORACLE_BACKDROP the same edge is a
//    fifty-level step, which lets the driver measure it a second, independent way.
//  - one cell renders at a time, named on screen, advanced by one button.
import { useState } from 'react'
import { Swift } from 'one-native'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { cells, type OracleCell } from './tab-bar-oracle-cells'

export const ORACLE_BACKDROP = '#00A03C'

function Panel({
  cell,
  index,
  onNext,
  presses,
}: {
  cell: OracleCell
  index: number
  onNext: () => void
  presses: number
}) {
  return (
    <View style={styles.panel}>
      <Text testID="tab-oracle-cell" style={styles.cellLabel}>
        Cell: {cell.id}
      </Text>
      <Text style={styles.meta}>
        {index + 1} of {cells.length}  axis: {cell.axis}  appearance: {cell.appearance}
      </Text>
      <Text style={styles.meta}>Action presses: {presses}</Text>
      <Pressable testID="tab-oracle-next" style={styles.button} onPress={onNext}>
        <Text style={styles.buttonText}>Next cell</Text>
      </Pressable>
    </View>
  )
}

function Cell({
  cell,
  index,
  onNext,
}: {
  cell: OracleCell
  index: number
  onNext: () => void
}) {
  const pageTabs = cell.tabs.filter((tab) => !tab.action)
  const initial = cell.tabs[cell.selectedIndex]
  if (!initial || initial.action) {
    throw new Error(`oracle cell ${cell.id} selects a tab that cannot hold the selection`)
  }
  const [selection, setSelection] = useState(initial.id)
  const [presses, setPresses] = useState(0)

  return (
    <Swift.Tabs
      selection={selection}
      onSelectionChange={setSelection}
      sidebarAdaptable={cell.sidebarAdaptable}
      tabBarMinimizeBehavior={cell.minimizeBehavior}
    >
      {cell.tabs.map((tab) =>
        tab.action ? (
          <Swift.Tab
            key={tab.id}
            id={tab.id}
            title={tab.title}
            systemImage={tab.systemImage}
            badge={tab.badge}
            role={tab.role}
            testID={`tab-oracle-tab-${tab.id}`}
            onPress={() => setPresses((count) => count + 1)}
          />
        ) : (
          <Swift.Tab
            key={tab.id}
            id={tab.id}
            title={tab.title}
            systemImage={tab.systemImage}
            badge={tab.badge}
            role={tab.role}
            testID={`tab-oracle-tab-${tab.id}`}
          >
            <View style={styles.page}>
              <Panel cell={cell} index={index} onNext={onNext} presses={presses} />
            </View>
          </Swift.Tab>
        )
      )}
    </Swift.Tabs>
  )
}

export default function TabOracleScreen() {
  const [index, setIndex] = useState(0)
  const cell = cells[index]
  return (
    <View style={styles.screen} testID="tab-oracle-screen">
      <Cell
        key={cell.id}
        cell={cell}
        index={index}
        onNext={() => setIndex((current) => (current + 1) % cells.length)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // the screen and the page share the backdrop, so whichever of the two SwiftUI leaves
  // showing behind the floating bar is the same flat colour.
  screen: { flex: 1, backgroundColor: ORACLE_BACKDROP },
  page: { flex: 1, backgroundColor: ORACLE_BACKDROP },
  // the panel stops well above the bar band the driver measures (y >= 700pt), so no fixture
  // ink can be mistaken for tab bar chrome.
  panel: { paddingTop: 80, paddingHorizontal: 20, gap: 8 },
  cellLabel: { fontSize: 20, fontWeight: '700', color: '#fff' },
  meta: { fontSize: 13, color: '#fff' },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
})
