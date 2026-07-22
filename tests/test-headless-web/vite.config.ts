import { one } from 'one/vite'
import type { Plugin, UserConfig } from 'vite'

/**
 * The point of this app: One's web output must not contain react-native-web.
 * It has no react-native dependency at all, so anything from react-native-web
 * that lands in a client chunk got there through One itself. Fails the build
 * rather than the test suite so the message points at the module.
 */
function assertNoReactNativeWeb(): Plugin {
  return {
    name: 'assert-no-react-native-web',
    apply: 'build',
    generateBundle(_options, bundle) {
      const leaked = new Set<string>()
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        for (const id of output.moduleIds) {
          if (/node_modules[/\\](react-native-web|react-native-screens)[/\\]/.test(id)) {
            leaked.add(id)
          }
        }
      }
      if (leaked.size) {
        throw new Error(
          `react-native is in the web bundle:\n${[...leaked].join('\n')}\n` +
            `One's web output must be headless. See plans/headless-web.md.`
        )
      }
    },
  }
}

export default {
  plugins: [
    assertNoReactNativeWeb(),
    one({
      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
    }),
  ],
} satisfies UserConfig
