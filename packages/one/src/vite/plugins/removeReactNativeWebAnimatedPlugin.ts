import type { Plugin, UserConfig } from 'vite'

/**
 * TODO this seems to just not work on prod build? it doesnt run setup at all
 */

export function removeReactNativeWebAnimatedPlugin(opts?: {
  panResponder?: boolean
}): Plugin {
  const filter = opts?.panResponder
    ? /(react-native\/Animated\/Animated|PlatformPressable|PanResponder|ResponderSystem)/
    : /(react-native\/Animated\/Animated|PlatformPressable)/

  const optimizeDeps = {
    rolldownOptions: {
      plugins: [
        {
          name: 'remove-react-native-web-animated',
          resolveId(source: string) {
            if (filter.test(source)) {
              return `\0proxy-wormify:${source}`
            }
          },
          load(id: string) {
            if (id.startsWith('\0proxy-wormify:')) {
              return `export * from "@tamagui/proxy-worm";`
            }
          },
        },
      ],
    },
  } satisfies UserConfig['optimizeDeps']

  return {
    name: 'remove-react-native-web-animated',

    config() {
      return {
        optimizeDeps,
      }
    },
  }
}
