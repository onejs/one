import { Tabs } from 'one'

// no custom child, so this uses the default headless web view, which is what
// honors keepMounted
export default function KeptLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="kept-a" options={{ title: 'Kept A', keepMounted: true }} />
      <Tabs.Screen name="kept-b" options={{ title: 'Kept B' }} />
    </Tabs>
  )
}
