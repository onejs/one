import { useCallback, useMemo, useState } from 'react'
import { Color, ToolbarHost, ToolbarItem } from '@vxrn/native'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { Stack } from 'one'
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native'

export default function ToolbarTestScreen() {
  const [lastAction, setLastAction] = useState<string>('none')
  const [actionCount, setActionCount] = useState(0)
  const isIOS = Platform.OS === 'ios'

  const handleAction = useCallback((action: string) => {
    setLastAction(action)
    setActionCount((c) => c + 1)
  }, [])
  const screenOptions = useMemo<NativeStackNavigationOptions>(
    () => ({
      headerSearchBarOptions: {
        placeholder: 'Search toolbar test',
      },
      unstable_headerRightItems: isIOS
        ? () => [
            {
              type: 'button' as const,
              label: 'Notifications',
              icon: { type: 'sfSymbol' as const, name: 'bell' },
              badge: { value: 3 },
              onPress: () => handleAction('notifications'),
            },
            {
              type: 'menu' as const,
              label: 'Actions',
              icon: { type: 'sfSymbol' as const, name: 'ellipsis.circle' },
              menu: {
                items: [
                  {
                    type: 'action' as const,
                    label: 'Share',
                    icon: { type: 'sfSymbol' as const, name: 'square.and.arrow.up' },
                    onPress: () => handleAction('share'),
                  },
                  {
                    type: 'action' as const,
                    label: 'Delete',
                    icon: { type: 'sfSymbol' as const, name: 'trash' },
                    destructive: true,
                    onPress: () => handleAction('delete'),
                  },
                ],
              },
            },
          ]
        : undefined,
    }),
    [handleAction, isIOS]
  )

  return (
    <View style={styles.container} testID="toolbar-test-screen">
      <Stack.Screen options={screenOptions} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text testID="toolbar-test-title" style={styles.title}>
          Toolbar Test
        </Text>

        <Text testID="toolbar-test-platform" style={styles.sectionLabel}>
          Platform: {Platform.OS}
        </Text>

        {/* status display */}
        <View testID="toolbar-status" style={styles.statusCard}>
          <Text style={styles.statusLabel}>Last Action:</Text>
          <Text testID="toolbar-last-action" style={styles.statusValue}>
            {lastAction}
          </Text>
          <Text style={styles.statusLabel}>Action Count:</Text>
          <Text testID="toolbar-action-count" style={styles.statusValue}>
            {actionCount}
          </Text>
        </View>

        {/* toolbar items description */}
        <Text testID="section-toolbar-items" style={styles.sectionTitle}>
          Toolbar Items
        </Text>

        <View testID="toolbar-items-list" style={styles.itemsList}>
          <View testID="toolbar-item-desc-add" style={styles.itemRow}>
            <Text style={styles.itemIcon}>+</Text>
            <Text style={styles.itemLabel}>Add - normal button with system icon</Text>
          </View>
          <View testID="toolbar-item-desc-search" style={styles.itemRow}>
            <Text style={styles.itemIcon}>🔍</Text>
            <Text style={styles.itemLabel}>Search - search bar type</Text>
          </View>
          <View testID="toolbar-item-desc-spacer" style={styles.itemRow}>
            <Text style={styles.itemIcon}>↔</Text>
            <Text style={styles.itemLabel}>Fluid spacer</Text>
          </View>
          <View testID="toolbar-item-desc-share" style={styles.itemRow}>
            <Text style={styles.itemIcon}>↑</Text>
            <Text style={styles.itemLabel}>Share - prominent style</Text>
          </View>
          <View testID="toolbar-item-desc-settings" style={styles.itemRow}>
            <Text style={styles.itemIcon}>⚙</Text>
            <Text style={styles.itemLabel}>Settings - with badge</Text>
          </View>
          <View testID="toolbar-item-desc-disabled" style={styles.itemRow}>
            <Text style={styles.itemIcon}>✕</Text>
            <Text style={styles.itemLabel}>Disabled - disabled button</Text>
          </View>
        </View>

        <View testID="toolbar-render-status" style={styles.statusBar}>
          <Text testID="toolbar-render-complete" style={styles.statusBarText}>
            Toolbar test rendered
          </Text>
        </View>
      </ScrollView>

      <ToolbarHost>
        <ToolbarItem
          identifier="add"
          title="Add"
          systemImageName="plus"
          tintColor={isIOS ? Color.ios.systemBlue : undefined}
          onSelected={() => handleAction('add')}
        />
        <ToolbarItem identifier="search" type="searchBar" />
        <ToolbarItem identifier="flex" type="fluidSpacer" />
        <ToolbarItem
          identifier="share"
          title="Share"
          systemImageName="square.and.arrow.up"
          barButtonItemStyle="prominent"
          onSelected={() => handleAction('share')}
        />
        <ToolbarItem
          identifier="settings"
          title="Settings"
          systemImageName="gearshape"
          badgeConfiguration={{
            value: '3',
            backgroundColor: isIOS ? Color.ios.systemRed : 'red',
          }}
          onSelected={() => handleAction('settings')}
        />
        <ToolbarItem identifier="fixed" type="fixedSpacer" width={20} />
        <ToolbarItem
          identifier="disabled"
          title="Disabled"
          systemImageName="xmark"
          disabled
          onSelected={() => handleAction('disabled')}
        />
      </ToolbarHost>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 12,
  },
  itemIcon: {
    fontSize: 18,
    width: 30,
    textAlign: 'center',
  },
  itemLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statusBar: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBarText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
})
