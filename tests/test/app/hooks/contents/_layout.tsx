import { Link, Slot, usePathname } from 'one'
import { View, Text } from 'tamagui'

export default function HooksTestingLayout() {
  const pathname = usePathname()
  return (
    <View>
      <Text id="layout-usePathname">Layout `usePathname()`: {pathname}</Text>
      <Slot />

      <Link href="/hooks/contents/page-1">
        <Text>Go to page-1</Text>
      </Link>
      <Link href="/hooks/contents/page-2">
        <Text>Go to page-2</Text>
      </Link>
      <Link href="/hooks">
        <Text>Go to index</Text>
      </Link>
    </View>
  )
}
