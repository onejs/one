import { Slot } from 'one'
import { View, StyleSheet } from 'react-native'
import { MainHeader } from '../../../../src/MainHeader'

// home tabs layout - shows MainHeader for all /home/* routes
// this is where the MainHeader lives (not in SiteLayout)
// replicates takeout's (app)/home/(tabs)/_layout.tsx

export default function HomeTabsLayout() {
  return (
    <View style={styles.container}>
      <MainHeader />
      <Slot />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
