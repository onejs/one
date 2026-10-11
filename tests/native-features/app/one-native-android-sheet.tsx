import { useRef, useState } from 'react'
import { One, type ComposeModalBottomSheetRef } from 'one'

export default function OneNativeAndroidSheet() {
  const sheet = useRef<ComposeModalBottomSheetRef>(null)
  const [show, setShow] = useState(false)
  const [locked, setLocked] = useState(false)
  const [status, setStatus] = useState('closed')

  const open = (scrimLocked: boolean) => {
    setLocked(scrimLocked)
    setShow(true)
    setStatus('open')
  }

  const hideByRef = async () => {
    await sheet.current?.hide()
    setShow(false)
    setStatus('hidden')
  }

  return (
    <One.Android.Column
      testID="one-native-android-sheet-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-sheet-status"
        text={`Sheet: ${status}`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.Button
          testID="one-native-android-sheet-open"
          label="Open sheet"
          variant="tonal"
          onPress={() => open(false)}
        />
        <One.Android.Button
          testID="one-native-android-sheet-open-locked"
          label="Open locked"
          variant="outlined"
          onPress={() => open(true)}
        />
      </One.Android.Row>
      <One.Android.Button
        testID="one-native-android-sheet-hide"
        label="Hide by ref"
        variant="text"
        onPress={() => void hideByRef()}
      />
      {show ? (
        <One.Android.ModalBottomSheet
          ref={sheet}
          onDismissRequest={() => {
            setShow(false)
            setStatus('dismissed')
          }}
          properties={locked ? { shouldDismissOnClickOutside: false } : undefined}
        >
          <One.Android.Text testID="one-native-android-sheet-body" text="Sheet body" />
        </One.Android.ModalBottomSheet>
      ) : null}
    </One.Android.Column>
  )
}
