const ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY = process.env.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY
if (!ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY) {
  throw new Error(
    'process.env.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY is not set, make sure you have your one plugin configured correctly.'
  )
}

export const ctx = require.context(
  ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY,
  true,
  // Ignore root `./+html.js` and API route files.
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+html)))\.[tj]sx?$).*\.[tj]sx?$/
)
