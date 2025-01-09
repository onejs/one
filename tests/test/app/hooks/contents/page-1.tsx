import { Link, usePathname } from 'one'
import { View, Text } from 'tamagui'

export default function HooksTestingPage() {
  const pathname = usePathname()

  return (
    <View>
      <Text>This is page-1</Text>
      <Text id="page-usePathname">Page `usePathname()`: {pathname}</Text>
    </View>
  )
}
