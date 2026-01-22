import { usePathname, Link } from 'one'
import { View, Text, StyleSheet } from 'react-native'

// replicates takeout's SiteRootLayout pattern:
// - shows SiteHeader when NOT on /home/* routes
// - hides SiteHeader when on /home/* routes (MainHeader shown in nested layout instead)

export function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAppRoute = pathname.startsWith('/home')

  return (
    <View style={styles.container} id="app-container">
      {/* site header only shown when NOT on /home/* */}
      {!isAppRoute && <SiteHeader />}

      <View style={styles.content}>{children}</View>

      {/* site footer only shown when NOT on /home/* */}
      {!isAppRoute && <SiteFooter />}
    </View>
  )
}

function SiteHeader() {
  return (
    <View style={styles.siteHeader} id="site-header">
      <Link href="/">
        <Text style={styles.logo}>Site Logo</Text>
      </Link>
      <View style={styles.nav}>
        <Link href="/docs" id="nav-docs">
          <Text style={styles.navLink}>Docs</Text>
        </Link>
        <Link href="/home/feed" id="nav-login">
          <Text style={styles.navLink}>Login</Text>
        </Link>
      </View>
    </View>
  )
}

function SiteFooter() {
  return (
    <View style={styles.siteFooter} id="site-footer">
      <Text style={styles.footerText}>Site Footer Content</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh' as any,
  },
  content: {
    flex: 1,
  },
  siteHeader: {
    height: 60,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logo: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nav: {
    flexDirection: 'row',
    gap: 16,
  },
  navLink: {
    color: '#aaa',
    fontSize: 14,
  },
  siteFooter: {
    height: 80,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
})
