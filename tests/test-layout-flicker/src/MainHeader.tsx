import { Link } from 'one'
import { View, Text, StyleSheet } from 'react-native'

// replicates takeout's MainHeader - shown only on /home/* routes
// note: the logo links to "/" which triggers the layout flash

export function MainHeader() {
  return (
    <View style={styles.mainHeader} id="main-header">
      {/* this link to "/" is the key - it causes navigation out of /home/* */}
      <Link href="/" id="logo-link">
        <Text style={styles.logo}>App Logo</Text>
      </Link>

      <View style={styles.tabs}>
        <Link href="/home/feed" id="tab-feed">
          <Text style={styles.tab}>Feed</Text>
        </Link>
        <Link href="/home/profile" id="tab-profile">
          <Text style={styles.tab}>Profile</Text>
        </Link>
      </View>

      <View style={styles.actions}>
        <Text style={styles.user}>User</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainHeader: {
    height: 60,
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  logo: {
    color: '#f90',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    gap: 24,
  },
  tab: {
    color: '#fff',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
  },
  user: {
    color: '#aaa',
    fontSize: 14,
  },
})
