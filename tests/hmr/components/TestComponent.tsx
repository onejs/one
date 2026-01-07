import { Text } from 'react-native'

const text = 'Some text'

export function TestComponent() {
  return <Text testID="component-text-content">{text}</Text>
}
