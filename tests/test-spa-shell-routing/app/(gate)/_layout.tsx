import { Redirect, Slot, usePathname } from 'one'
import { recordLayoutMount, useAuth } from '../../auth-context'

// mirrors takeout's app/(app)/_layout.tsx: a single layout sits as the
// common parent of /gate-auth/* (login pages) and /gate-home/* (post-auth
// pages), and decides which side to redirect to based on auth state.
//
// when auth flips from logged-out -> logged-in interactively (e.g. user
// clicks "Login as Demo"), this layout returns <Redirect /> instead of
// <Slot />, which:
//   1. unmounts the entire (gate) navigator subtree
//   2. router.replace fires from inside Redirect -> URL becomes /gate-home/feed
//   3. layout re-renders with new pathname, returns <Slot /> again
//   4. (gate) navigator re-mounts and must resolve to /gate-home/feed
//
// the takeout bug: after step 4 the URL says /gate-home/feed but the slot
// still renders /gate-auth/login content. this layout reproduces that exact
// shape.
export default function GateLayout() {
  const auth = useAuth()
  const pathname = usePathname()
  recordLayoutMount(`(gate) auth=${auth} pathname=${pathname}`)

  if (auth === 'loading') {
    return <div id="gate-loading">loading</div>
  }

  if (auth === 'logged-in' && pathname.startsWith('/gate-auth')) {
    return <Redirect href="/gate-home/feed" />
  }
  if (auth === 'logged-out' && pathname.startsWith('/gate-home')) {
    return <Redirect href="/gate-auth/login" />
  }

  return (
    <div id="gate-layout" data-pathname={pathname} data-auth={auth}>
      <Slot />
    </div>
  )
}
