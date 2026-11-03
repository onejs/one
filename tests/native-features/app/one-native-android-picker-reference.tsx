import { useState, type ComponentProps } from 'react'
import { One, Stack } from 'one'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// explicit inputs match the seeded expo reference without changing the lifecycle fixture.
const dateColors = {
  containerColor: '#ECE6EE',
  titleContentColor: '#49454E',
  headlineContentColor: '#49454E',
  weekdayContentColor: '#1D1B20',
  subheadContentColor: '#49454E',
  navigationContentColor: '#49454E',
  yearContentColor: '#49454E',
  disabledYearContentColor: '#49454E61',
  currentYearContentColor: '#65558F',
  selectedYearContentColor: '#FFFFFF',
  disabledSelectedYearContentColor: '#FFFFFF61',
  selectedYearContainerColor: '#65558F',
  disabledSelectedYearContainerColor: '#65558F61',
  dayContentColor: '#1D1B20',
  disabledDayContentColor: '#1D1B2061',
  selectedDayContentColor: '#FFFFFF',
  disabledSelectedDayContentColor: '#FFFFFF61',
  selectedDayContainerColor: '#65558F',
  disabledSelectedDayContainerColor: '#65558F61',
  todayContentColor: '#65558F',
  todayDateBorderColor: '#65558F',
  dayInSelectionRangeContentColor: '#4A4458',
  dayInSelectionRangeContainerColor: '#E8DEF8',
  dividerColor: '#CAC4CF',
} satisfies NonNullable<ComponentProps<typeof One.Android.DatePicker>['colors']>

const timeColors = {
  containerColor: '#ECE6EE',
  clockDialColor: '#E6E0E9',
  clockDialSelectedContentColor: '#FFFFFF',
  clockDialUnselectedContentColor: '#1D1B20',
  selectorColor: '#65558F',
  periodSelectorBorderColor: '#7A757F',
  periodSelectorSelectedContainerColor: '#FFD9E3',
  periodSelectorUnselectedContainerColor: 'transparent',
  periodSelectorSelectedContentColor: '#633B48',
  periodSelectorUnselectedContentColor: '#49454E',
  timeSelectorSelectedContainerColor: '#E9DDFF',
  timeSelectorUnselectedContainerColor: '#E6E0E9',
  timeSelectorSelectedContentColor: '#4D3D75',
  timeSelectorUnselectedContentColor: '#1D1B20',
} satisfies NonNullable<ComponentProps<typeof One.Android.TimePicker>['colors']>

export default function OneNativeAndroidPickerReference() {
  const [date, setDate] = useState(() => new Date(2031, 2, 12))
  const [clock, setClock] = useState(() => new Date(2031, 2, 12, 10, 15))
  const [section, setSection] = useState<'date' | 'time' | 'time24'>('date')
  const [dialog, setDialog] = useState<'date' | 'time' | null>(null)
  const [result, setResult] = useState('none')

  const tab = (id: string, label: string, onPress: () => void) => (
    <Pressable
      testID={id}
      onPress={onPress}
      style={{ paddingHorizontal: 12, paddingVertical: 10 }}
    >
      <Text style={{ color: '#1D1B20', fontSize: 15 }}>{label}</Text>
    </Pressable>
  )

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      testID="one-picker-reference-root"
      style={{ backgroundColor: '#FFFFFF', flex: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 60, left: 0, right: 0 }}
      >
        <Text
          testID="one-picker-reference-state"
          style={{ color: '#FFFFFF', fontSize: 1, lineHeight: 1 }}
        >
          {`section:${section} dialog:${dialog ?? 'none'} result:${result}`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {tab('one-picker-reference-date', 'Date', () => setSection('date'))}
        {tab('one-picker-reference-time', 'Time', () => setSection('time'))}
        {tab('one-picker-reference-time24', '24h', () => setSection('time24'))}
        {tab('one-picker-reference-open-date', 'Date dialog', () => setDialog('date'))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {tab('one-picker-reference-open-time', 'Time dialog', () => setDialog('time'))}
      </View>
      <View testID="one-picker-reference-stage" style={{ flex: 1 }}>
        {section === 'date' ? (
          <One.Android.DatePicker
            testID="one-picker-reference-picker"
            selection={date}
            onSelectionChange={setDate}
            colors={dateColors}
            style={{ flex: 1 }}
            composeStyle={{ fillMaxWidth: true, fillMaxHeight: true }}
          />
        ) : (
          <One.Android.TimePicker
            key={section}
            testID="one-picker-reference-picker"
            selection={clock}
            onSelectionChange={setClock}
            is24Hour={section === 'time24'}
            colors={timeColors}
            style={{ flex: 1 }}
            composeStyle={{ fillMaxWidth: true, fillMaxHeight: true }}
          />
        )}
        <One.Android.DatePickerDialog
          visible={dialog === 'date'}
          selection={date}
          colors={dateColors}
          color="#65558F"
          onConfirm={() => {
            setResult('confirmed')
            setDialog(null)
          }}
          onDismiss={() => {
            setResult('dismissed')
            setDialog(null)
          }}
        />
        <One.Android.TimePickerDialog
          visible={dialog === 'time'}
          selection={clock}
          is24Hour={false}
          colors={timeColors}
          color="#65558F"
          onConfirm={() => {
            setResult('confirmed')
            setDialog(null)
          }}
          onDismiss={() => {
            setResult('dismissed')
            setDialog(null)
          }}
        />
      </View>
    </SafeAreaView>
  )
}
