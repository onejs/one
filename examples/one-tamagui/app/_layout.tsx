import '~/tamagui/tamagui.css'
import './_layout.css'

import { SchemeProvider } from '@vxrn/color-scheme'
import { LoadProgressBar, Slot, setRouteMasks, createRouteMask } from 'one'
import { TamaguiRootProvider } from '../src/tamagui/TamaguiRootProvider'

// Configure route masks for URL masking
// This masks /photos/[id]/modal to show as /photos/[id]__<base64> in the browser
//
// useSearchParam: true encodes the actual route as a base64 postfix in the URL, enabling:
// - SSR to render the correct route (no flash on refresh)
// - URL contains the "truth" about what to render
// - No query parameter visible, just a base64 suffix after __
setRouteMasks([
  createRouteMask({
    from: '/photos/[id]/modal',
    to: '/photos/[id]',
    params: true,
    useSearchParam: true, // Encode actual route in URL for SSR support
  }),
])

/**
 * The root _layout.tsx filters <html /> and <body /> out on native
 */

export default function Layout() {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <link rel="icon" href="/favicon.svg" />

        <title>👋</title>
      </head>

      <body>
        {/* <LoadProgressBar /> */}

        <SchemeProvider>
          <TamaguiRootProvider>
            <Slot />
          </TamaguiRootProvider>
        </SchemeProvider>
      </body>
    </html>
  )
}
