import { Slot, usePathname } from 'one'
import { useEffect, useState } from 'react'

// simulates an auth gate that delays rendering children —
// this is the pattern that triggers late navigator mounting
export default function RouteGroupLayout() {
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (!ready) {
    return <div id="group-parent-loading">loading</div>
  }

  return (
    <>
      <div id="group-parent-pathname">{pathname}</div>
      <Slot />
    </>
  )
}
