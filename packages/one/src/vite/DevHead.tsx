import { VIRTUAL_SSR_CSS_HREF } from '../constants'

export function DevHead() {
  if (process.env.TAMAGUI_TARGET === 'native') {
    return null
  }
  // skip in SPA/headless mode — no SSR means no SSR CSS to hydrate,
  // and the virtual module isn't served outside the vite dev server
  if (globalThis['__vxrnIsSPA']) {
    return null
  }
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        <link rel="preload" href={VIRTUAL_SSR_CSS_HREF} as="style" />
        <link
          rel="stylesheet"
          href={VIRTUAL_SSR_CSS_HREF}
          data-ssr-css
          suppressHydrationWarning
        />
        <script type="module" src="/@one/dev.js" suppressHydrationWarning />
      </>
    )
  }
  return null
}
