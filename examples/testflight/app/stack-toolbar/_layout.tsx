import { Stack } from 'one'

/**
 * Direct oracle for the declarative Stack.Toolbar API. No Leading slot is
 * declared here by contract: the native back button owns leading placement
 * and its visibility flips globally at install. Trailing slots compile to
 * native header items; the bottom toolbar mounts in screen content
 * (index.native.tsx) where the responder chain reaches the screen view
 * controller.
 */
export default function StackToolbarOracleLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Toolbar oracle' }} />
      <Stack.Screen name="detail" options={{ title: 'Toolbar detail' }}>
        <Stack.Toolbar>
          <Stack.Toolbar.Trailing>
            <Stack.Toolbar.Menu
              title="More"
              systemImageName="ellipsis.circle"
              accessibilityLabel="Detail trailing menu"
            >
              <Stack.Toolbar.Item
                title="Share"
                systemImageName="square.and.arrow.up"
                accessibilityLabel="Detail trailing share"
                onPress={() => {}}
              />
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Trailing>
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  )
}
