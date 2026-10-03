import { Redirect } from 'one'
import { isWeb } from 'tamagui'
import { useAuth } from '~/auth/client/authClient'
import { APP_HOME_HREF } from '~/features/app/routes'
import { Hero } from '~/interface/site/Hero'
import { SiteShell } from '~/interface/site/SiteShell'

// web: everyone — signed in or not — sees the splash. logged-in visitors
// jump into the real app via the Open app cta in the header / hero.
// native: no public splash — first boot resolves its session-aware target
// here (signed-in to the app home, signed-out to /auth/login) so launch
// costs exactly one replace instead of index -> auth/login -> home.
// Redirect only fires while this screen is focused, so a cold deep link
// (index parked as a back-stack entry) keeps its own destination, and the
// auth/home layouts keep their protection for direct entry, sign-out, and
// expiry. rendering a surface directly here kept the URL at "/", so every
// signed-out capture recorded observed "/" against a declared route and the
// evaluation's route receipt invalidated the capture.

// native-only route: hooks stay out of the shared web/native Index below,
// and the web landing keeps no auth subscription.
function NativeIndex() {
  const auth = useAuth()
  // hold for the session restore; the auth layout still owns the spinner
  // surface once a signed-out boot reaches it.
  if (auth.state === 'loading') return null
  return <Redirect href={auth.user ? APP_HOME_HREF : '/auth/login'} />
}

export default function Index() {
  if (!isWeb) {
    return <NativeIndex />
  }

  return (
    <SiteShell>
      <Hero />
    </SiteShell>
  )
}
