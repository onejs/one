import { Slot, useMatches } from 'one'
import { View, Text } from 'tamagui'

// layout loader - data is accessed via useMatches
export async function loader() {
  return {
    layoutData: 'layout-loader-data',
    timestamp: Date.now(),
  }
}

export default function MatchesTestLayout() {
  const matches = useMatches()
  // find this layout's data in matches
  const layoutMatch = matches.find((m) => m.routeId.includes('matches-test/_layout'))
  const data = layoutMatch?.loaderData as { layoutData?: string } | undefined

  return (
    <View f={1}>
      <Text testID="layout-data" accessibilityLabel={`layout-data: ${data?.layoutData || 'loading'}`}>
        Layout: {data?.layoutData || 'loading'}
      </Text>
      <Slot />
    </View>
  )
}
