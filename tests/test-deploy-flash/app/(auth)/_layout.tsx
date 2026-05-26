import { Redirect, Slot } from 'one'
import { useEffect, useSyncExternalStore } from 'react'

// mirrors takeout2's gate pattern: a layout that reads "is authed" and
// renders <Redirect /> when the gate flips, instead of <Slot />.
let authed = false
const listeners = new Set<() => void>()
function subscribeAuthStore(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function getAuthSnapshot() {
  return authed
}
function getAuthServerSnapshot() {
  return false
}

export default function AuthLayout() {
  const isAuthed = useSyncExternalStore(
    subscribeAuthStore,
    getAuthSnapshot,
    getAuthServerSnapshot
  )

  useEffect(() => {
    ;(window as Window & { __flipAuth?: () => void }).__flipAuth = () => {
      authed = true
      listeners.forEach((cb) => cb())
    }
  }, [])

  if (isAuthed) {
    return <Redirect href="/project/redirected/main" />
  }

  return <Slot />
}
