import { Slot, useParams, usePathname } from 'one'
import { Text, View } from 'tamagui'

export default function HooksTestingSlugLayout() {
  const pathname = usePathname()
  const params = useParams()

  return (
    <View>
      <Text id="slug-layout-usePathname">
        Slug layout `usePathname()`:{' '}
        <Text testID="slug-layout-usePathname">{pathname}</Text>
      </Text>
      <Text id="slug-layout-useParams">
        Slug layout `useParams()`:{' '}
        <Text testID="slug-layout-useParams">{JSON.stringify(params)}</Text>
      </Text>

      <Slot />
    </View>
  )
}
