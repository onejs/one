// web counterpart of routeHmr.native.ts. Web route Fast Refresh happens through
// the `one-hmr-update` event (see useScreens' web block), so this is a no-op store
// whose exports let useScreens import `./routeHmr` on either platform.
export const subscribeRouteHmr = (_onStoreChange: () => void): (() => void) => {
  return () => {}
}

export const getRouteHmrEpoch = () => 0
