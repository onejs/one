import type { Plugin } from 'vite'

export function removeReactNativeWebAnimatedPlugin(): Plugin {
  return {
    name: 'remove-react-native-web-animated',
    config() {
      return {
        optimizeDeps: {
          esbuildOptions: {
            plugins: [
              {
                name: 'remove-react-native-web-animated',
                setup(build) {
                  build.onResolve(
                    {
                      filter: /(react-native\/Animated\/Animated|PlatformPressable)$/,
                    },
                    (args) => {
                      return { path: args.path, namespace: 'proxy-wormify' }
                    }
                  )

                  build.onLoad({ filter: /.*/, namespace: 'proxy-wormify' }, (args) => {
                    return {
                      contents: `export * from "@tamagui/proxy-worm";`,
                      loader: 'js',
                    }
                  })
                },
              },
            ],
          },
        },
      }
    },
  }
}
