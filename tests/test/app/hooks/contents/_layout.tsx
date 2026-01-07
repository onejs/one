import { Slot, useParams, usePathname } from 'one'
import { View, Text } from 'tamagui'
import { HooksTestingLinks } from '~/features/hooks-testing/HooksTestingLinks'

export default function HooksTestingLayout() {
  const pathname = usePathname()
  const params = useParams()

  return (
    <View>
      <Text id="layout-usePathname">
        Layout `usePathname()`: <Text testID="layout-usePathname">{pathname}</Text>
      </Text>
      <Text id="layout-useParams">
        Layout `useParams()`:{' '}
        <Text testID="layout-useParams">{JSON.stringify(params)}</Text>
      </Text>

      <Slot />

      <HooksTestingLinks />
    </View>
  )
}
