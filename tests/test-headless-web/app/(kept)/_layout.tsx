import { Tabs } from 'one'
import { useState } from 'react'

// no custom child, so this uses the default headless web view, which is what
// honors keepMounted
export default function KeptLayout() {
  // guards against the layout being remounted by navigation, which would throw
  // away this state along with every screen the navigator is keeping mounted
  const [count, setCount] = useState(0)

  return (
    <>
      <span data-testid="layout-count">{count}</span>
      <button type="button" data-testid="layout-inc" onClick={() => setCount(count + 1)}>
        inc
      </button>
      <Tabs>
        <Tabs.Screen name="kept-a" options={{ title: 'Kept A', keepMounted: true }} />
        <Tabs.Screen name="kept-b" options={{ title: 'Kept B' }} />
      </Tabs>
    </>
  )
}
