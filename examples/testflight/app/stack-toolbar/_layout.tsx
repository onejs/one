import { Stack } from 'one'

/**
 * Direct oracle for the declarative Stack.Toolbar API. Leading/trailing
 * slots compile to native header items here; the bottom toolbar mounts in
 * screen content (index.native.tsx) where the responder chain reaches the
 * screen view controller.
 */
export default function StackToolbarOracleLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Toolbar oracle' }}>
        <Stack.Toolbar>
          <Stack.Toolbar.Leading>
            <Stack.Toolbar.Item
              title="Edit"
              systemImageName="pencil"
              accessibilityLabel="Oracle leading edit"
              accessibilityHint="Edits the oracle entry"
              onPress={() => {}}
            />
          </Stack.Toolbar.Leading>
          <Stack.Toolbar.Trailing>
            <Stack.Toolbar.Menu
              title="More"
              systemImageName="ellipsis.circle"
              accessibilityLabel="Oracle trailing menu"
            >
              <Stack.Toolbar.Item
                title="Share"
                systemImageName="square.and.arrow.up"
                accessibilityLabel="Oracle trailing share"
                onPress={() => {}}
              />
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Trailing>
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  )
}
