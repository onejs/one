/**
 * The transforms one needs applied to native bundles, in a form the metro
 * transformer worker can reach.
 *
 * The worker lives in `@vxrn/vite-plugin-metro`, which one depends on, so it
 * cannot import from here directly — it resolves this subpath out of the user's
 * own `one` install instead. Everything re-exported here must stay free of
 * vite: the worker runs in a bare node process.
 */

export { transformTreeShakeClient } from './vite/plugins/clientTreeShakePlugin'
