import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeFormSlotStyle({
  initialCustom = false,
  initialSheet = false,
}: { initialCustom?: boolean; initialSheet?: boolean }) {
  const [custom, setCustom] = useState(initialCustom)
  const [sheet, setSheet] = useState(initialSheet)

  return (
    <View style={styles.screen} testID="one-native-form-slot-style-screen">
      <Pressable testID="one-native-form-slot-style-toggle" onPress={() => setCustom((value) => !value)}>
        <Text>{`Form and Slot style: ${custom ? 'custom' : 'default'}`}</Text>
      </Pressable>
      <One.iOS.Form
        style={styles.form}
        swiftStyle={
          custom
            ? {
                contentMarginsWithEdgesAndLengthAndPlacement: {
                  edges: 'top',
                  length: 0,
                  placement: 'scrollContent',
                },
                listSectionSpacingWithCGFloat: 40,
              }
            : undefined
        }
      >
        <One.iOS.Section>
          <One.iOS.Slot
            height={44}
            swiftStyle={
              custom
                ? { listRowInsets: { edges: 'leading', length: 64 }, background: 'orange' }
                : undefined
            }
          >
            <View style={styles.row} testID="one-native-form-slot-style-row">
              <Text>Hosted React Native row</Text>
            </View>
          </One.iOS.Slot>
        </One.iOS.Section>
        <One.iOS.Section title="Second">
          <One.iOS.Text text="Native row" />
        </One.iOS.Section>
      </One.iOS.Form>
      <Pressable testID="one-native-form-slot-style-open" onPress={() => setSheet(true)}>
        <Text>Open sheet</Text>
      </Pressable>
      <One.iOS.Sheet
        isPresented={sheet}
        onIsPresentedChange={setSheet}
        presentationDetents={['large']}
        presentationBackground="#FFE08A"
      >
        <View style={styles.sheet} testID="one-native-form-slot-style-sheet">
          <One.iOS.Form style={styles.sheetForm}>
            <One.iOS.Section title="Rows">
              {Array.from({ length: 24 }, (_, index) => (
                <One.iOS.Text key={index} text={`Row ${index + 1}`} />
              ))}
            </One.iOS.Section>
          </One.iOS.Form>
          <View style={styles.sheetEdge} />
        </View>
      </One.iOS.Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, paddingHorizontal: 20, gap: 16, backgroundColor: '#FFFFFF' },
  form: { width: 340, height: 360 },
  sheet: { flex: 1 },
  sheetForm: { flex: 1 },
  sheetEdge: { height: 6, backgroundColor: 'red' },
  row: { height: 44, justifyContent: 'center', backgroundColor: 'rgba(0,128,255,0.25)' },
})
