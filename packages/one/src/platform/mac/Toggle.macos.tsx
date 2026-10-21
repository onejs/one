import { useControlled } from '../controlled'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
import type { ViewProps } from 'react-native'
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes'

type ChangeEvent = Readonly<{
  isOn: boolean
  revision: Int32
  eventCount: Int32
}>

interface NativeProps extends ViewProps {
  label: string
  isOn: boolean
  revision: Int32
  acknowledgedEvent: Int32
  onIsOnChange?: DirectEventHandler<ChangeEvent>
}

const NativeToggle = codegenNativeComponent<NativeProps>('OneMacToggle')

export function Toggle({
  label,
  isOn,
  revision = 0,
  onIsOnChange,
}: {
  label: string
  isOn: boolean
  revision?: number
  onIsOnChange?: (event: { isOn: boolean; revision: number }) => void
}) {
  const controlled = useControlled((event: ChangeEvent) => {
    onIsOnChange?.({ isOn: event.isOn, revision: event.revision })
  }, revision)
  return (
    <NativeToggle
      label={label}
      isOn={isOn}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onIsOnChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
