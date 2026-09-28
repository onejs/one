import { useRouter } from 'one'
import { Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { updatesBoot } from '../fixtures/updates-boot'

// the updates suite swaps updates-boot.ts per publish variant, and the home
// screen renders the running bundle's marker (see the setup file for the
// entry-chunk throw and delay, which must run before anything mounts).

const testScreens = [
  { href: '/color-test', label: 'Color API', testID: 'nav-color-test' },
  { href: '/zoom-test', label: 'Zoom Transitions', testID: 'nav-zoom-test' },
  { href: '/toolbar-test', label: 'Toolbar', testID: 'nav-toolbar-test' },
  { href: '/menu-test', label: 'Menu Actions', testID: 'nav-menu-test' },
  { href: '/split-view-test', label: 'Split View', testID: 'nav-split-view-test' },
  { href: '/bars-action-bar', label: 'Bars Action Bar', testID: 'nav-bars-action-bar' },
  { href: '/bars-double-bar', label: 'Bars Double Bar', testID: 'nav-bars-double-bar' },
  { href: '/bars-probe/main', label: 'Bars Button Probe', testID: 'nav-bars-probe' },
  {
    href: '/bars-probe-control',
    label: 'Bars Probe Control',
    testID: 'nav-bars-probe-control',
  },
  {
    href: '/one-native-controls',
    label: 'One Native Controls',
    testID: 'nav-one-native-controls',
  },
  {
    href: '/one-native-picker-palette',
    label: 'One Native Picker Palette',
    testID: 'nav-one-native-picker-palette',
  },
  {
    href: '/one-native-edit-button',
    label: 'One Native Edit Button',
    testID: 'nav-one-native-edit-button',
  },
  {
    href: '/one-native-list-row-modifiers',
    label: 'One Native List Row Modifiers',
    testID: 'nav-one-native-list-row-modifiers',
  },
  {
    href: '/one-native-list-section-modifiers',
    label: 'One Native List Section Modifiers',
    testID: 'nav-one-native-list-section-modifiers',
  },
  {
    href: '/one-native-list-search-refresh',
    label: 'One Native List Search and Refresh',
    testID: 'nav-one-native-list-search-refresh',
  },
  {
    href: '/one-native-scroll-search-refresh',
    label: 'One Native Scroll Search and Refresh',
    testID: 'nav-one-native-scroll-search-refresh',
  },
  {
    href: '/one-native-building-blocks',
    label: 'One Native Building Blocks',
    testID: 'nav-one-native-building-blocks',
  },
  {
    href: '/one-native-share-empty',
    label: 'One Native Share and Empty',
    testID: 'nav-one-native-share-empty',
  },
  {
    href: '/one-native-web-photos',
    label: 'One Native Web and Photos',
    testID: 'nav-one-native-web-photos',
  },
  {
    href: '/one-native-tab-slot',
    label: 'One Native Tab Slot',
    testID: 'nav-one-native-tab-slot',
  },
  {
    href: '/one-native-tab-sidebar',
    label: 'One Native Tab Sidebar',
    testID: 'nav-one-native-tab-sidebar',
  },
  {
    href: '/one-native-paste-button',
    label: 'One Native Paste Button',
    testID: 'nav-one-native-paste-button',
  },
  {
    href: '/one-native-group-box',
    label: 'One Native Group Box',
    testID: 'nav-one-native-group-box',
  },
  {
    href: '/one-native-view-that-fits',
    label: 'One Native View That Fits',
    testID: 'nav-one-native-view-that-fits',
  },
  {
    href: '/one-native-view-slot',
    label: 'One Native ViewSlot',
    testID: 'nav-one-native-view-slot',
  },
  {
    href: '/one-native-safe-area-bar',
    label: 'One Native Safe Area Bar',
    testID: 'nav-one-native-safe-area-bar',
  },
  {
    href: '/one-native-linear-gradient',
    label: 'One Native Linear Gradient',
    testID: 'nav-one-native-linear-gradient',
  },
  {
    href: '/one-native-radial-gradient',
    label: 'One Native Radial Gradient',
    testID: 'nav-one-native-radial-gradient',
  },
  {
    href: '/one-native-angular-gradient',
    label: 'One Native Angular Gradient',
    testID: 'nav-one-native-angular-gradient',
  },
  {
    href: '/one-native-elliptical-gradient',
    label: 'One Native Elliptical Gradient',
    testID: 'nav-one-native-elliptical-gradient',
  },
  {
    href: '/one-native-mesh-gradient',
    label: 'One Native Mesh Gradient',
    testID: 'nav-one-native-mesh-gradient',
  },
  {
    href: '/one-native-horizontal-inset',
    label: 'One Native Horizontal Inset',
    testID: 'nav-one-native-horizontal-inset',
  },
  {
    href: '/one-native-horizontal-bar',
    label: 'One Native Horizontal Bar',
    testID: 'nav-one-native-horizontal-bar',
  },
  {
    href: '/one-native-swipe-actions',
    label: 'One Native Swipe Actions',
    testID: 'nav-one-native-swipe-actions',
  },
  {
    href: '/one-native-disclosure-group',
    label: 'One Native Disclosure Group',
    testID: 'nav-one-native-disclosure-group',
  },
  {
    href: '/one-native-control-group',
    label: 'One Native Control Group',
    testID: 'nav-one-native-control-group',
  },
  {
    href: '/one-native-sheet',
    label: 'One Native Sheets',
    testID: 'nav-one-native-sheet',
  },
  {
    href: '/one-native-navigation',
    label: 'One Native Navigation',
    testID: 'nav-one-native-navigation',
  },
  {
    href: '/one-native-leaves',
    label: 'One Native Leaves',
    testID: 'nav-one-native-leaves',
  },
  {
    href: '/one-native-dialogs',
    label: 'One Native Dialogs',
    testID: 'nav-one-native-dialogs',
  },
  {
    href: '/one-native-host',
    label: 'One Native Host',
    testID: 'nav-one-native-host',
  },
  {
    href: '/one-native-control-size',
    label: 'One Native Control Size',
    testID: 'nav-one-native-control-size',
  },
  {
    href: '/one-native-containers',
    label: 'One Native Containers',
    testID: 'nav-one-native-containers',
  },
  {
    href: '/one-native-effects',
    label: 'One Native Effects',
    testID: 'nav-one-native-effects',
  },
  {
    href: '/one-native-popover',
    label: 'One Native Popover',
    testID: 'nav-one-native-popover',
  },
  {
    href: '/one-native-accessibility',
    label: 'One Native Accessibility',
    testID: 'nav-one-native-accessibility',
  },
  {
    href: '/one-native-media',
    label: 'One Native Media',
    testID: 'nav-one-native-media',
  },
  {
    href: '/one-native-image-picker',
    label: 'One Native Image Picker',
    testID: 'nav-one-native-image-picker',
  },
  {
    href: '/one-native-camera',
    label: 'One Native Camera',
    testID: 'nav-one-native-camera',
  },
  {
    href: '/one-native-document-picker',
    label: 'One Native Document Picker',
    testID: 'nav-one-native-document-picker',
  },
  {
    href: '/one-native-audio',
    label: 'One Native Audio',
    testID: 'nav-one-native-audio',
  },
  {
    href: '/one-native-share',
    label: 'One Native Share',
    testID: 'nav-one-native-share',
  },
  {
    href: '/one-native-photo-library',
    label: 'One Native Photo Library',
    testID: 'nav-one-native-photo-library',
  },
  {
    href: '/one-native-image-manipulator',
    label: 'One Native Image Manipulator',
    testID: 'nav-one-native-image-manipulator',
  },
  {
    href: '/one-native-editors',
    label: 'One Native Editors',
    testID: 'nav-one-native-editors',
  },
  {
    href: '/one-native-glass-container',
    label: 'One Native Glass Container',
    testID: 'nav-one-native-glass-container',
  },
  {
    href: '/one-native-grids',
    label: 'One Native Grids',
    testID: 'nav-one-native-grids',
  },
  {
    href: '/one-native-device',
    label: 'One Native Device',
    testID: 'nav-one-native-device',
  },
  {
    href: '/one-native-database',
    label: 'One Native Database',
    testID: 'nav-one-native-database',
  },
  {
    href: '/one-native-contacts',
    label: 'One Native Contacts',
    testID: 'nav-one-native-contacts',
  },
  {
    href: '/one-native-calendar',
    label: 'One Native Calendar',
    testID: 'nav-one-native-calendar',
  },
  {
    href: '/one-native-map',
    label: 'One Native Map',
    testID: 'nav-one-native-map',
  },
  {
    href: '/one-native-map-services',
    label: 'One Native Map Services',
    testID: 'nav-one-native-map-services',
  },
  {
    href: '/one-native-ui-map',
    label: 'One Native UI Map',
    testID: 'nav-one-native-ui-map',
  },
  {
    href: '/one-native-gpu',
    label: 'One Native GPU',
    testID: 'nav-one-native-gpu',
  },
  {
    href: '/one-native-lists',
    label: 'One Native Lists',
    testID: 'nav-one-native-lists',
  },
  {
    href: '/one-native-groups',
    label: 'One Native Groups',
    testID: 'nav-one-native-groups',
  },
  {
    href: '/one-native-state',
    label: 'One Native State',
    testID: 'nav-one-native-state',
  },
  {
    href: '/one-native-safe-area',
    label: 'One Native Safe Area',
    testID: 'nav-one-native-safe-area',
  },
  {
    href: '/one-native-fonts',
    label: 'One Native Fonts',
    testID: 'nav-one-native-fonts',
  },
  {
    href: '/one-native-pip',
    label: 'One Native Picture in Picture',
    testID: 'nav-one-native-pip',
  },
  {
    href: '/one-native-haptics',
    label: 'One Native Haptics',
    testID: 'nav-one-native-haptics',
  },
  {
    href: '/one-native-crypto',
    label: 'One Native Crypto',
    testID: 'nav-one-native-crypto',
  },
  {
    href: '/one-native-app-info',
    label: 'One Native App Info',
    testID: 'nav-one-native-app-info',
  },
  { href: '/one-native', label: 'One Native', testID: 'nav-one-native' },
  {
    href: '/one-native-autogen',
    label: 'One Native SDK Generation',
    testID: 'nav-one-native-autogen',
  },
  {
    href: '/one-native-arrangement',
    label: 'One Native Arrangement',
    testID: 'nav-one-native-arrangement',
  },
  {
    href: '/one-native-arrangement-view',
    label: 'One Native ArrangementView Conformance',
    testID: 'nav-one-native-arrangement-view',
  },
  {
    href: '/one-native-android',
    label: 'One Native Android Proof',
    testID: 'nav-one-native-android',
  },
  {
    href: '/one-native-android-inputs',
    label: 'One Native Android Inputs',
    testID: 'nav-one-native-android-inputs',
  },
  {
    href: '/one-native-android-selection',
    label: 'One Native Android Selection',
    testID: 'nav-one-native-android-selection',
  },
  {
    href: '/one-native-android-cards',
    label: 'One Native Android Cards',
    testID: 'nav-one-native-android-cards',
  },
  {
    href: '/one-native-android-dividers',
    label: 'One Native Android Dividers',
    testID: 'nav-one-native-android-dividers',
  },
  {
    href: '/one-native-android-filter-chip',
    label: 'One Native Android Filter Chip',
    testID: 'nav-one-native-android-filter-chip',
  },
  {
    href: '/one-native-android-chips',
    label: 'One Native Android Chips',
    testID: 'nav-one-native-android-chips',
  },
  {
    href: '/one-native-android-badges',
    label: 'One Native Android Badges',
    testID: 'nav-one-native-android-badges',
  },
  {
    href: '/one-native-android-list-items',
    label: 'One Native Android List Items',
    testID: 'nav-one-native-android-list-items',
  },
  {
    href: '/one-native-android-flow-row',
    label: 'One Native Android Flow Row',
    testID: 'nav-one-native-android-flow-row',
  },
  {
    href: '/one-native-android-icon-buttons',
    label: 'One Native Android Icon Buttons',
    testID: 'nav-one-native-android-icon-buttons',
  },
  {
    href: '/one-native-android-loading',
    label: 'One Native Android Loading',
    testID: 'nav-one-native-android-loading',
  },
  {
    href: '/one-native-android-surface',
    label: 'One Native Android Surface',
    testID: 'nav-one-native-android-surface',
  },
  {
    href: '/one-native-android-progress',
    label: 'One Native Android Progress',
    testID: 'nav-one-native-android-progress',
  },
  {
    href: '/one-native-android-segmented',
    label: 'One Native Android Segmented',
    testID: 'nav-one-native-android-segmented',
  },
  {
    href: '/one-native-tabview',
    label: 'One Native TabView Parity',
    testID: 'nav-one-native-tabview',
  },
  {
    href: '/one-native-tab-oracle',
    label: 'One Native Tab Bar Oracle',
    testID: 'nav-one-native-tab-oracle',
  },
  {
    href: '/one-native-cover-context',
    label: 'One Native Cover and Context',
    testID: 'nav-one-native-cover-context',
  },
  {
    href: '/one-native-menu-primary-action',
    label: 'One Native Menu Primary Action',
    testID: 'nav-one-native-menu-primary-action',
  },
  {
    href: '/one-native-system',
    label: 'One Native System',
    testID: 'nav-one-native-system',
  },
  {
    href: '/one-native-notifications',
    label: 'One Native Notifications',
    testID: 'nav-one-native-notifications',
  },
  {
    href: '/one-native-apple-file',
    label: 'One Native Apple File',
    testID: 'nav-one-native-apple-file',
  },
  {
    href: '/one-native-image',
    label: 'One Native Image',
    testID: 'nav-one-native-image',
  },
  {
    href: '/one-native-clipboard',
    label: 'One Native Clipboard',
    testID: 'nav-one-native-clipboard',
  },
  {
    href: '/one-native-network',
    label: 'One Native Network',
    testID: 'nav-one-native-network',
  },
  {
    href: '/one-native-browser',
    label: 'One Native Browser',
    testID: 'nav-one-native-browser',
  },
  {
    href: '/one-native-apple-auth',
    label: 'One Native Apple Auth',
    testID: 'nav-one-native-apple-auth',
  },
  {
    href: '/one-native-local-authentication',
    label: 'One Native Local Authentication',
    testID: 'nav-one-native-local-authentication',
  },
  {
    href: '/one-native-protected-store',
    label: 'One Native Protected Store',
    testID: 'nav-one-native-protected-store',
  },
  {
    href: '/one-native-app-tracking',
    label: 'One Native App Tracking',
    testID: 'nav-one-native-app-tracking',
  },
  {
    href: '/one-native-location',
    label: 'One Native Location',
    testID: 'nav-one-native-location',
  },
  {
    href: '/one-native-file-system',
    label: 'One Native File System',
    testID: 'nav-one-native-file-system',
  },
  {
    href: '/one-native-speech',
    label: 'One Native Speech',
    testID: 'nav-one-native-speech',
  },
  {
    href: '/one-native-updates',
    label: 'One Native Updates',
    testID: 'nav-one-native-updates',
  },
  {
    href: '/one-native-fetch',
    label: 'One Native Fetch',
    testID: 'nav-one-native-fetch',
  },
  {
    href: '/one-native-secure-store',
    label: 'One Native Secure Store',
    testID: 'nav-one-native-secure-store',
  },
] as const

export default function HomeScreen() {
  const router = useRouter()

  const go = (href: string) => {
    console.log('[NAV] pushing', href)
    try {
      router.push(href as any)
    } catch (e: any) {
      console.error('[NAV] error', e)
      Alert.alert('Nav Error', e.message)
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="home-screen"
    >
      <Text testID="home-title" style={styles.title}>
        One Native Test Suite
      </Text>

      <Text testID="home-subtitle" style={styles.subtitle}>
        Tap a test to navigate
      </Text>

      {updatesBoot.marker === 'embedded' ? null : (
        <Text style={styles.subtitle}>Marker: {updatesBoot.marker}</Text>
      )}

      {testScreens.map((screen) => (
        <TouchableOpacity
          key={screen.href}
          testID={screen.testID}
          style={styles.card}
          activeOpacity={0.6}
          onPress={() => go(screen.href)}
        >
          <Text style={styles.cardText}>{screen.label}</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 80,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 18,
    color: '#999',
  },
})
