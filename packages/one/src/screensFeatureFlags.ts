// enables synchronous layout updates for react-native-screens
// this fixes issues like flex: 1 not working properly in formSheet presentations
// and ensures header config updates are applied synchronously

let hasInitialized = false

export function initScreensFeatureFlags() {
  if (hasInitialized) return
  hasInitialized = true

  try {
    const { featureFlags } = require('react-native-screens')
    if (featureFlags?.experiment) {
      featureFlags.experiment.synchronousScreenUpdatesEnabled = true
      featureFlags.experiment.synchronousHeaderConfigUpdatesEnabled = true
      featureFlags.experiment.synchronousHeaderSubviewUpdatesEnabled = true
    }
  } catch {
    // react-native-screens may not be available (e.g. web-only builds)
  }
}
