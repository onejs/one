import { One, Stack } from 'one'

/**
 * Direct oracle for the declarative Stack.Toolbar API. No left slot is
 * declared here by contract: the native back button owns left placement
 * and its visibility flips globally at install. Right slots compile to
 * native header items; the bottom toolbar mounts in screen content
 * (index.native.tsx) where the responder chain reaches the screen view
 * controller.
 */
export default function StackToolbarOracleLayout() {
  return (
    <One.UI.SafeArea.Provider>
      <Stack>
      <Stack.Screen name="index" options={{ title: 'Toolbar oracle' }} />
      <Stack.Screen name="detail" options={{ title: 'Toolbar detail' }}>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu
            title="More"
            icon="ellipsis.circle"
            accessibilityLabel="Detail trailing menu"
          >
            <Stack.Toolbar.MenuAction
              icon="square.and.arrow.up"
              accessibilityLabel="Detail trailing share"
              onPress={() => {}}
            >
              Share
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      </Stack.Screen>
      </Stack>
    </One.UI.SafeArea.Provider>
  )
}
