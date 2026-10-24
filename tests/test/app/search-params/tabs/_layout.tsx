// @ts-expect-error the universal typecheck resolves native conditions; this file is web-only
import { Tabs, TabList, TabSlot, TabTrigger } from 'one/ui'
import { Link } from 'one'
import { Text, View } from 'react-native'

export default function SearchParamsTabsLayout() {
  return (
    <Tabs style={{ display: 'flex', flex: 1 }}>
      <TabSlot detachInactiveScreens={false} />
      <TabList style={{ display: 'flex', flexDirection: 'row', padding: 10 }}>
        <TabTrigger name="one" href="/search-params/tabs/one">
          <Text>One</Text>
        </TabTrigger>
        <TabTrigger name="two" href="/search-params/tabs/two">
          <Text>Two</Text>
        </TabTrigger>
        <TabTrigger name="three/[id]" href="/search-params/tabs/three/9">
          <Text>Three</Text>
        </TabTrigger>
      </TabList>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Link testID="go-one" href="/search-params/tabs/one">
          <Text>go one</Text>
        </Link>
        <Link testID="go-two" href="/search-params/tabs/two">
          <Text>go two</Text>
        </Link>
        <Link testID="go-two-hash" href="/search-params/tabs/two#frag">
          <Text>go two with hash</Text>
        </Link>
      </View>
    </Tabs>
  )
}
