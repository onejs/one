import { One, Stack } from 'one'

export default function AdaptivePanelLayout() {
  return (
    <One.UI.SafeArea.Provider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Adaptive panel' }} />
      </Stack>
    </One.UI.SafeArea.Provider>
  )
}
