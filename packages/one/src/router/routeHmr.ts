// Web counterpart of routeHmr.native.ts. Web route Fast Refresh happens through
// the `one-hmr-update` event (see useScreens' web block), so this is a no-op store
// — its exports exist only so useScreens can import `./routeHmr` platform-agnostically.
export const subscribeRouteHmr = (_onStoreChange: () => void): (() => void) => {
  return () => {}
}

export const getRouteHmrEpoch = () => 0
