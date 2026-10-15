export default {
  plugins: [{
    name: 'round2-ssr-vendor-diagnostic',
    configResolved(config) {
      const options = config.environments.ssr.optimizeDeps
      const before = options.include
      options.include = before.filter((id) => !id.startsWith('@vxrn/vendor/react'))
      console.log(JSON.stringify({ diagnostic: 'ssr-unused-vendor', before: before.length, after: options.include.length, removed: before.filter((id) => !options.include.includes(id)), noDiscovery: options.noDiscovery }))
    },
  }],
}
