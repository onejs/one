import { useState } from 'react'
import { SplitView } from '@vxrn/native'
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native'

const sidebarItems = [
  { id: 'inbox', label: 'Inbox', count: 12 },
  { id: 'sent', label: 'Sent', count: 0 },
  { id: 'drafts', label: 'Drafts', count: 3 },
  { id: 'archive', label: 'Archive', count: 0 },
  { id: 'trash', label: 'Trash', count: 1 },
]

function SidebarContent({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <View style={styles.sidebar} testID="split-sidebar">
      <Text testID="split-sidebar-title" style={styles.sidebarTitle}>
        Sidebar
      </Text>
      {sidebarItems.map((item) => (
        <Pressable
          key={item.id}
          testID={`split-sidebar-item-${item.id}`}
          style={[
            styles.sidebarItem,
            selectedId === item.id && styles.sidebarItemSelected,
          ]}
          onPress={() => onSelect(item.id)}
        >
          <Text
            style={[
              styles.sidebarItemText,
              selectedId === item.id && styles.sidebarItemTextSelected,
            ]}
          >
            {item.label}
          </Text>
          {item.count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.count}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  )
}

function DetailContent({ selectedId }: { selectedId: string }) {
  const item = sidebarItems.find((i) => i.id === selectedId)
  return (
    <View style={styles.detail} testID="split-detail">
      <Text testID="split-detail-title" style={styles.detailTitle}>
        {item?.label || 'Select an item'}
      </Text>
      <Text testID="split-detail-id" style={styles.detailSubtitle}>
        ID: {selectedId}
      </Text>
      <Text testID="split-detail-count" style={styles.detailInfo}>
        Items: {item?.count ?? 0}
      </Text>
    </View>
  )
}

function MainSlot() {
  return (
    <View style={styles.mainSlot} testID="split-main-slot">
      <Text testID="split-main-title" style={styles.mainTitle}>
        Main Content Area
      </Text>
      <Text style={styles.mainDescription}>
        This is the main content slot of the SplitView
      </Text>
    </View>
  )
}

export default function SplitViewTestScreen() {
  const [selectedId, setSelectedId] = useState('inbox')
  const isIOS = Platform.OS === 'ios'

  return (
    <View style={styles.container} testID="split-view-test-screen">
      <Text testID="split-view-title" style={styles.title}>
        SplitView Test
      </Text>

      <Text testID="split-view-platform" style={styles.platformLabel}>
        Platform: {Platform.OS} {!isIOS ? '(SplitView only supported on iOS)' : ''}
      </Text>

      {isIOS ? (
        <View style={styles.splitContainer} testID="split-view-container">
          <SplitView slot={MainSlot}>
            <SplitView.Column>
              <SidebarContent selectedId={selectedId} onSelect={setSelectedId} />
            </SplitView.Column>
          </SplitView>
        </View>
      ) : (
        <View testID="split-view-fallback" style={styles.fallback}>
          <Text style={styles.fallbackText}>
            SplitView is only available on iOS / iPadOS
          </Text>
          {/* render sidebar and detail as stacked views on non-iOS */}
          <SidebarContent selectedId={selectedId} onSelect={setSelectedId} />
          <DetailContent selectedId={selectedId} />
        </View>
      )}

      <View testID="split-view-render-status" style={styles.statusBar}>
        <Text testID="split-view-render-complete" style={styles.statusText}>
          SplitView test rendered
        </Text>
        <Text testID="split-view-selected-id" style={styles.statusDetail}>
          Selected: {selectedId}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  platformLabel: {
    fontSize: 13,
    color: '#888',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  splitContainer: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  fallbackText: {
    position: 'absolute',
    top: 0,
    left: 16,
    fontSize: 12,
    color: '#f44336',
    fontStyle: 'italic',
  },
  sidebar: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  sidebarItemText: {
    fontSize: 15,
    color: '#333',
  },
  sidebarItemTextSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detail: {
    flex: 2,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  detailInfo: {
    fontSize: 14,
    color: '#666',
  },
  mainSlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  mainDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statusBar: {
    margin: 16,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
  statusDetail: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 4,
  },
})
