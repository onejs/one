import { useState } from 'react'
import { One } from 'one'

const pad = (value: number) => String(value).padStart(2, '0')
const day = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const time = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

export default function OneNativeAndroidPickers() {
  const [date, setDate] = useState(() => new Date(2026, 9, 5, 14, 37))
  const [clock, setClock] = useState(() => new Date(2026, 9, 5, 14, 37))
  const [policy, setPolicy] = useState<'reject' | 'accept'>('reject')
  const [requests, setRequests] = useState(0)
  const [dialog, setDialog] = useState<'date' | 'time' | null>(null)
  const [dialogResult, setDialogResult] = useState('none')
  const [inline, setInline] = useState<'date' | 'time'>('date')

  return (
    <One.Android.Column
      testID="one-native-android-pickers-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-pickers-status"
        text={`Date: ${day(date)} ${time(date)} · Time: ${time(clock)} · Policy: ${policy} · Requests: ${requests} · Dialog: ${dialogResult}`}
      />
      <One.Android.FlowRow horizontalArrangement={{ spacedBy: 8 }}>
        <One.Android.Button
          testID="one-native-android-pickers-policy"
          label="Accept"
          variant="tonal"
          onPress={() => setPolicy('accept')}
        />
        <One.Android.Button
          testID="one-native-android-pickers-open-date"
          label="Date dialog"
          variant="outlined"
          onPress={() => setDialog('date')}
        />
        <One.Android.Button
          testID="one-native-android-pickers-open-time"
          label="Time dialog"
          variant="outlined"
          onPress={() => setDialog('time')}
        />
        <One.Android.Button
          testID="one-native-android-pickers-swap"
          label={inline === 'date' ? 'Show time' : 'Show date'}
          variant="text"
          onPress={() => setInline(inline === 'date' ? 'time' : 'date')}
        />
      </One.Android.FlowRow>
      {inline === 'time' ? (
        <One.Android.TimePicker
          testID="one-native-android-pickers-time"
          selection={clock}
          is24Hour
          onSelectionChange={(next) => {
            setRequests((count) => count + 1)
            if (policy === 'accept') setClock(next)
          }}
        />
      ) : (
        <One.Android.DatePicker
          testID="one-native-android-pickers-date"
          selection={date}
          minimumDate={new Date(2026, 9, 3)}
          maximumDate={new Date(2026, 9, 30)}
          color="#347b6a"
          onSelectionChange={(next) => {
            setRequests((count) => count + 1)
            if (policy === 'accept') setDate(next)
          }}
        />
      )}
      <One.Android.DatePickerDialog
        visible={dialog === 'date'}
        selection={date}
        confirmLabel="Use date"
        onConfirm={(next) => {
          setDialog(null)
          setDialogResult(`date ${day(next)} ${time(next)}`)
        }}
        onDismiss={() => {
          setDialog(null)
          setDialogResult('dismissed')
        }}
      />
      <One.Android.TimePickerDialog
        visible={dialog === 'time'}
        selection={clock}
        is24Hour
        confirmLabel="Use time"
        onConfirm={(next) => {
          setDialog(null)
          setDialogResult(`time ${day(next)} ${time(next)}`)
        }}
        onDismiss={() => {
          setDialog(null)
          setDialogResult('dismissed')
        }}
      />
    </One.Android.Column>
  )
}
