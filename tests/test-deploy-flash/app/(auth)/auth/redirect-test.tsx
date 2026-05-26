import { useState } from 'react'
import { Redirect } from 'one'

// mirrors a takeout2 / soot auth flow: a screen that conditionally renders
// <Redirect> after a state flip (e.g. "Login as Demo User" click).
// the redirect target lives in a different route group than this screen.

export default function RedirectTestRoute() {
  const [shouldRedirect, setShouldRedirect] = useState(false)

  if (shouldRedirect) {
    return <Redirect href="/project/redirected/main" />
  }

  return (
    <div id="redirect-test-marker">
      <span>REDIRECT TEST</span>
      <button id="flip-redirect" onClick={() => setShouldRedirect(true)}>
        flip
      </button>
    </div>
  )
}
