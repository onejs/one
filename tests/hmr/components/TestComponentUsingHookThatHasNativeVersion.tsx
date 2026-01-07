import { Text } from 'react-native'
import { useSomething } from '../other/HookThatHasNativeVersion'

const text = 'Some text in TestComponentUsingHookThatHasNativeVersion'

export function TestComponentUsingHookThatHasNativeVersion() {
  const hookReturnValue = useSomething()
  return (
    <>
      <Text testID="TestComponentUsingHookThatHasNativeVersion-text-content">{text}</Text>
      <Text testID="TestComponentUsingHookThatHasNativeVersion-hook-value">
        {hookReturnValue}
      </Text>
    </>
  )
}
