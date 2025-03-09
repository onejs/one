import { View, H1 } from 'tamagui'
import { HooksTestingLinks } from '~/features/hooks-testing/HooksTestingLinks'

export default function HooksTestingIndexPage() {
  return (
    <View>
      <H1>Hooks Testing Index</H1>

      <HooksTestingLinks />
    </View>
  )
}
