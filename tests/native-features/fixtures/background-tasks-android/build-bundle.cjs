const path = require('node:path')
const fs = require('node:fs')
const Metro = require('metro')
const config = require('./metro.config.cjs')
Metro.runBuild(config, {
  entry: path.join(__dirname, 'entry.tsx'),
  bundleOut: path.join(__dirname, 'assets/index.android.bundle'),
  platform: 'android',
  dev: false,
  minify: true,
})
  .then(() => {
    if (fs.statSync(path.join(__dirname, 'assets/index.android.bundle')).size === 0)
      throw new Error('embedded bundle is empty')
    console.log('BACKGROUND_BUNDLE_READY')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
