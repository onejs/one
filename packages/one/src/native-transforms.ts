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
import { renderKotlinSourceModule } from './vite/plugins/kotlinSourceModule'
import { renderSwiftPackageModule } from './vite/plugins/swiftPackageModule'

// a .swift or .kt import becomes the js module that calls its prebuilt native glue.
export function renderNativeSourceModule(id: string, platform: string, root: string) {
  return id.endsWith('.kt')
    ? renderKotlinSourceModule(id, platform, root)
    : renderSwiftPackageModule(id, platform, root)
}
