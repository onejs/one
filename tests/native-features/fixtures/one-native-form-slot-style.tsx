import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, type ScrollViewProxy } from 'one'

type SheetKind = 'form' | 'list' | 'scroll'

function ScrollToLast({ proxy }: { proxy: ScrollViewProxy }) {
  // anchoring the last row at the top clamps the scroll to its maximum
  useEffect(() => {
    const timer = setTimeout(() => proxy.scrollTo('row-last', 'top'), 1500)
    return () => clearTimeout(timer)
  }, [proxy])
  return null
}

export default function OneNativeFormSlotStyle({
  initialCustom = false,
  initialSheet = false,
  sheetKind = 'form',
  resetAfterMs,
}: {
  initialCustom?: boolean
  initialSheet?: boolean
  sheetKind?: SheetKind
  // flips the Form and Slot styles back to default after this many milliseconds
  resetAfterMs?: number
}) {
  const [custom, setCustom] = useState(initialCustom)
  const [sheet, setSheet] = useState(initialSheet)

  useEffect(() => {
    if (resetAfterMs === undefined) return
    const timer = setTimeout(() => setCustom(false), resetAfterMs)
    return () => clearTimeout(timer)
  }, [resetAfterMs])

  const rows = Array.from({ length: 40 }, (_, index) => (
    <One.iOS.Text
      key={index}
      text={index === 39 ? 'Last row' : `Row ${index + 1}`}
      swiftStyle={{ id: index === 39 ? 'row-last' : `row-${index}`, height: 44 }}
    />
  ))

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
          <One.iOS.ScrollViewReader style={styles.sheetForm}>
            {(proxy) => (
              <>
                <ScrollToLast proxy={proxy} />
                {sheetKind === 'form' ? (
                  <One.iOS.Form style={styles.sheetForm}>
                    <One.iOS.Section title="Rows">{rows}</One.iOS.Section>
                  </One.iOS.Form>
                ) : sheetKind === 'list' ? (
                  <One.iOS.List style={styles.sheetForm} listStyle="plain">
                    {rows}
                  </One.iOS.List>
                ) : (
                  <One.iOS.ScrollView style={styles.sheetForm}>
                    <One.iOS.VStack spacing={0}>{rows}</One.iOS.VStack>
                  </One.iOS.ScrollView>
                )}
              </>
            )}
          </One.iOS.ScrollViewReader>
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
