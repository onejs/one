export default {
  plugins: [{
    name: 'round2-ssr-prescan-diagnostic',
    configResolved(config) {
      const options = config.environments.ssr.optimizeDeps
      const before = options.include
      const required = new Set(['react/jsx-runtime', 'react/jsx-dev-runtime', 'react/compiler-runtime', 'react-dom/server', 'react-dom/client', '@tamagui/config/v5'])
      options.include = ['react', 'react-dom', ...required]
      options.entries = config.environments.client.optimizeDeps.entries
      if (!options.entries?.length) throw new Error('no route entries for SSR scan')
      options.holdUntilCrawlEnd = true
      options.noDiscovery = false
      console.log(JSON.stringify({ diagnostic: 'ssr-import-prescan', before: before.length, after: options.include.length, include: options.include }))
    },
  }],
}
