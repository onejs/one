import type { Plugin } from 'vite'

/**
 * Filter out plugins and plugin hooks that are not needed for (or will even break) React Native.
 */
export function filterPluginsForNative(
  plugins: Plugin[],
  { isNative }: { isNative: boolean }
): Plugin[] {
  return plugins
    .flatMap((p) => {
      if (p.name.endsWith('-web-only')) {
        return null
      }

      if (p.name === 'vite:reporter') {
        return {
          ...p,
          // Printing out bundle details such as all the files that are included in the bundle and their sizes will cutter the terminal and also waste time.
          writeBundle: undefined,
        }
      }

      // Filter out unnecessary `renderChunk` hooks that are not needed for RN
      if (
        isNative /* See: https://github.com/universal-future/one/pull/23#issuecomment-2381402764 */ &&
        p.renderChunk
      ) {
        if (
          [
            'vite:build-metadata', // Inserts asset and CSS related metadata which is not needed for RN (see: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/metadata.ts#L10-L16)
            'vite:worker', // See: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/worker.ts#L383-L429
            'vite:asset', // Seems not needed since with RN we have our own asset handling logic (see: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/asset.ts#L214-L227)
            'vite:css-post', // Seems not needed since we are not using CSS-in-JS for RN (see: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/css.ts#L560-L830)
            'vite:force-systemjs-wrap-complete', // Not needed since we are not using SystemJS (see: https://github.com/vitejs/vite/blob/v6.0.0-alpha.18/packages/vite/src/node/plugins/completeSystemWrap.ts#L12-L21)
            // 'vite:build-import-analysis',
            'vite:esbuild-transpile', // Seems to be ok to remove.
            'vite:reporter',
          ].includes(p.name)
        ) {
          return {
            ...p,
            renderChunk: undefined,
          }
        }
      }

      return p
    })
    .filter((p) => p !== null)
}
