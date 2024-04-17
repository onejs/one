import type { Plugin } from 'vite'

export function rscEnvPlugin({
  config,
}: {
  config?: {
    basePath: string
    rscPath: string
  }
}): Plugin {
  return {
    name: 'rsc-env-plugin',
    config(viteConfig) {
      viteConfig.define = {
        ...viteConfig.define,
        ...Object.fromEntries([
          ...(config
            ? [
                ['import.meta.env.WAKU_CONFIG_BASE_PATH', JSON.stringify(config.basePath)],
                ['import.meta.env.WAKU_CONFIG_RSC_PATH', JSON.stringify(config.rscPath)],
              ]
            : []),
        ]),
      }
    },
  }
}
