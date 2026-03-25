import type { Plugin } from 'vite'
import { setResolvedConfig } from './getResolvedConfigSubset'

export function getServerConfigPlugin() {
  return {
    name: 'get-server-config',

    configResolved(conf) {
      setResolvedConfig({
        base: conf.base,
        mode: conf.mode,
        server: conf.server,
        define: conf.define,
      })
    },
  } satisfies Plugin
}
