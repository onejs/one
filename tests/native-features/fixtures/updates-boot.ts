// boot behavior for the updates suite. the runner swaps this file per
// publish variant (see updates-variants/) and restores it after: the marker
// names the running bundle, delayMs blocks before first render, and throws
// crashes the boot before first render.
export const updatesBoot = {
  marker: 'embedded',
  delayMs: 0,
  throws: false,
}
