# Native development bundle timeouts

The new-route test can fail at its first `navigateTo`, before creating a route.
A native launch after Fast Refresh asks for the latest full bundle. Rebuilding
that bundle and compiling Hermes bytecode can outlast iOS's default URLSession
request timeout. Warming the initial bundle does not warm that later rebuild.

React Native sends `Accept: multipart/mixed`. Its `RCTMultipartDataTask` changes
from a data task to a stream when the response has a quoted multipart boundary.
Metro starts that response before building. One must do the same, including an
immediate preamble and build-status parts while work is pending. Headers alone
still leave an idle stream that iOS cancels; ongoing status parts keep it active.
The final part carries either the JavaScript/bytecode bytes or an error with `X-Http-Status: 500`. Clients without the multipart Accept header
still receive a plain response.

## Investigation on 2026-10-19

Jobs 118384511309 (run 39341448193) and 118470712601 (run 39374838586)
failed at the first navigation in the new-route test. The first Fast Refresh
test passed. Both second launches spent approximately a minute loading before
the app hierarchy changed to an error screen; no HMR client connected for those
launches. The retained Appium log truncates the error text. The passing run
39366646689 had similar initial build time, so an initial readiness delay does
not distinguish the failures.

A local iOS 27 simulator probe held a native bundle response for 65 seconds.
The plain response was canceled at 60.3 seconds with "Could not connect to
development server." A headers-only multipart response also timed out at 60.4
seconds. With a build-status part every ten seconds, the same native loader
received and executed the Hermes bytecode after 65 seconds. The delivered
probe deliberately throws "slow native bundle delivered" to distinguish script
execution from the network error. The HTTP regression check holds the actual native build
behind a gate, requires response headers before releasing it, and verifies the
completed bundle, plain-client response, and multipart build error. It failed
before the repair and passed afterward.

Earlier jobs 118058205018 and 118008471524 never reached the tests: both failed
restoring the Hermes compiler cache. They are separate infrastructure failures.
