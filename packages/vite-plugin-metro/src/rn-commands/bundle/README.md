We are copying code from `@react-native/community-cli-plugin` mostly because we need to pass custom things into the babel-transformer.
If we can find a better way to do that, we probably can just import `unstable_buildBundleWithConfig` from `@react-native/community-cli-plugin` and just use it.
