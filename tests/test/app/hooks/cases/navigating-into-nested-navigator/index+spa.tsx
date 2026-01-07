// Need to use SPA for this file because we are testing the client-side JS router.
// SSR can cause false positives if the test runs before the client-side JS is ready,
// resulting in a full page load instead of SPA-style navigation.

import { Link } from 'one'
import { View } from 'react-native'

export default function Index() {
  return (
    <View style={{ backgroundColor: 'white' }}>
      <Link
        testID="navigate-into-nested-page"
        href="/hooks/cases/navigating-into-nested-navigator/nested-1/nested-2/page"
      >
        Navigate into nested page
      </Link>
    </View>
  )
}
