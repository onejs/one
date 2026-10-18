import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'
import { UICalendarSelectionSingleDate, UICalendarView } from 'one/ios/UIKit'

// a UIKit view built entirely through the generated SDK bindings, placed by the one
// shared UIKit host: standalone in a React Native box, then composed in a SwiftUI stack.
async function makeCalendar(onDay: (day: number | null) => void) {
  const calendar = await UICalendarView.init()
  const selection = await UICalendarSelectionSingleDate.init({
    dateSelectionDidSelectDate: (_selection, date) => onDay(date?.day ?? null),
  })
  await calendar.setSelectionBehavior(selection)
  return calendar
}

export default function OneNativeUIKitView() {
  const [standalone, setStandalone] = useState<UICalendarView | null>(null)
  const [composed, setComposed] = useState<UICalendarView | null>(null)
  const [standaloneDay, setStandaloneDay] = useState<number | null>(null)
  const [composedDay, setComposedDay] = useState<number | null>(null)

  useEffect(() => {
    makeCalendar(setStandaloneDay).then(setStandalone)
    makeCalendar(setComposedDay).then(setComposed)
  }, [])

  return (
    <View style={styles.screen}>
      <Text testID="one-native-uikit-view-standalone-day">
        Standalone day: {standaloneDay ?? 'none'}
      </Text>
      {standalone && (
        <One.iOS.UIKitView
          view={standalone}
          testID="one-native-uikit-view-standalone"
          style={styles.calendar}
        />
      )}
      <Text testID="one-native-uikit-view-composed-day">
        Composed day: {composedDay ?? 'none'}
      </Text>
      {composed && (
        <One.iOS.VStack style={styles.calendar}>
          <One.iOS.UIKitView view={composed} testID="one-native-uikit-view-composed" />
        </One.iOS.VStack>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 90,
    gap: 8,
    backgroundColor: '#fff',
  },
  calendar: { height: 330 },
})
