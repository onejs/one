import { Redirect, Slot } from 'one'
import { recordLayoutMount, useAuth } from '../../auth-context'

export default function AuthedLayout() {
  const auth = useAuth()
  recordLayoutMount(`(authed) auth=${auth}`)

  // mimic an auth gate: synchronous Redirect when logged-out. if (authed)
  // mounts on a non-(authed) URL because the navigator picked the wrong
  // sibling group, this redirect bounces the user to /login — that's the
  // bug the regression test guards against.
  if (auth === 'logged-out') {
    return <Redirect href="/login" />
  }

  return (
    <div id="authed-layout" data-layout="authed">
      <Slot />
    </div>
  )
}
