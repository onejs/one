export default {
  plugins: [{
    name: 'round2-ssr-discovery-diagnostic',
    configResolved(config) {
      const options = config.environments.ssr.optimizeDeps
      const before = options.include
      const required = new Set(['react/jsx-runtime', 'react/jsx-dev-runtime', 'react/compiler-runtime', 'react-dom/server', 'react-dom/client', '@tamagui/config/v5'])
      options.include = options.include.filter((id) => /^(?:@[^/]+\/)?[^/]+$/.test(id) || required.has(id))
      options.noDiscovery = false
      console.log(JSON.stringify({ diagnostic: 'ssr-import-discovery', before: before.length, after: options.include.length, include: options.include }))
    },
  }],
}
