const { withPodfile } = require('@expo/config-plugins')

module.exports = (config) =>
  withPodfile(config, (config) => {
    const gammaEnvironment = "ENV['RNS_GAMMA_ENABLED'] ||= '1'"

    if (!config.modResults.contents.includes(gammaEnvironment)) {
      config.modResults.contents = `${gammaEnvironment}\n${config.modResults.contents}`
    }

    return config
  })
