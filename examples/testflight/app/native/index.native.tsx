import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack'
import { Link, One } from 'one'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

type NativeCapabilitiesStack = {
  capabilities: undefined
  zoom: undefined
}

const Stack = createNativeStackNavigator<NativeCapabilitiesStack>()

export default function NativeCapabilitiesNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="capabilities"
        component={NativeCapabilitiesScreen}
        options={{ title: 'Native capabilities' }}
      />
      <Stack.Screen
        name="zoom"
        component={NativeCapabilitiesDetailScreen}
        options={{ title: 'Zoom detail' }}
      />
    </Stack.Navigator>
  )
}

function NativeCapabilitiesScreen({
  navigation,
}: NativeStackScreenProps<NativeCapabilitiesStack, 'capabilities'>) {
  const [lastAction, setLastAction] = useState('none')
  const [actionCount, setActionCount] = useState(0)

  const recordAction = (action: string) => {
    setLastAction(action)
    setActionCount((count) => count + 1)
  }

  return (
    <View style={styles.container} testID="native-capabilities-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>One.iOS capabilities</Text>

        <Pressable
          accessibilityRole="button"
          testID="native-capabilities-exit"
          style={styles.action}
          onPress={() => navigation.getParent()?.navigate('profile')}
        >
          <Text style={styles.actionText}>Return to tabs</Text>
        </Pressable>

        <Link href="/stack-toolbar" asChild>
          <Pressable
            accessibilityRole="button"
            testID="native-open-stack-toolbar-oracle"
            style={styles.action}
          >
            <Text style={styles.actionText}>Open toolbar oracle</Text>
          </Pressable>
        </Link>

        <Link href="/adaptive-panel" asChild>
          <Pressable
            accessibilityRole="button"
            testID="native-open-adaptive-panel-oracle"
            style={styles.action}
          >
            <Text style={styles.actionText}>Open adaptive panel oracle</Text>
          </Pressable>
        </Link>

        <View
          testID="native-color-swatch"
          style={[styles.colorSwatch, { backgroundColor: One.iOS.Color.systemBlue }]}
        >
          <Text style={styles.colorLabel}>iOS systemBlue</Text>
        </View>

        <One.iOS.ZoomTransitionSource identifier="testflight-native-capability">
          <Pressable
            accessibilityRole="button"
            testID="native-zoom-source"
            style={styles.action}
            onPress={() => navigation.push('zoom')}
          >
            <Text style={styles.actionText}>Open zoom destination</Text>
          </Pressable>
        </One.iOS.ZoomTransitionSource>

        <View style={styles.status}>
          <Text testID="native-toolbar-last-action">Toolbar action: {lastAction}</Text>
          <Text testID="native-toolbar-action-count">Toolbar count: {actionCount}</Text>
        </View>
      </ScrollView>

      <One.iOS.ToolbarHost>
        <One.iOS.ToolbarItem
          identifier="testflight-add"
          title="Add"
          systemImageName="plus"
          accessibilityLabel="Native toolbar add"
          onSelected={() => recordAction('add')}
        />
        <One.iOS.ToolbarItem identifier="testflight-space" type="fluidSpacer" />
        <One.iOS.MenuAction
          identifier="testflight-actions"
          title="Actions"
          label="Actions"
          icon="ellipsis.circle"
          accessibilityLabel="Native toolbar actions"
        >
          <One.iOS.MenuAction
            identifier="testflight-mark"
            title="Mark reviewed"
            icon="checkmark.circle"
            onSelected={() => recordAction('menu')}
          />
        </One.iOS.MenuAction>
      </One.iOS.ToolbarHost>
    </View>
  )
}

function NativeCapabilitiesDetailScreen({
  navigation,
}: NativeStackScreenProps<NativeCapabilitiesStack, 'zoom'>) {
  return (
    <View style={styles.detail} testID="native-zoom-destination">
      <One.iOS.ZoomTransitionEnabler zoomTransitionSourceIdentifier="testflight-native-capability" />
      <Text style={styles.detailTitle}>Zoom destination mounted</Text>
      <Pressable
        accessibilityRole="button"
        testID="native-zoom-back"
        style={styles.action}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.actionText}>Back to capabilities</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, gap: 16, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '700' },
  colorSwatch: {
    minHeight: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  action: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#1465c0', fontSize: 16, fontWeight: '600' },
  status: { gap: 6, padding: 16, borderRadius: 12, backgroundColor: '#fff' },
  detail: {
    flex: 1,
    padding: 24,
    backgroundColor: '#4a90d9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  detailTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
})
