import type { Plugin, UserConfig } from "vite";

/**
 * TODO this seems to just not work on prod build? it doesnt run setup at all
 */

export function removeReactNativeWebAnimatedPlugin(opts?: { panResponder?: boolean }): Plugin {
  const filter = opts?.panResponder
    ? /(react-native\/Animated\/Animated|PlatformPressable|PanResponder|ResponderSystem)/
    : /(react-native\/Animated\/Animated|PlatformPressable)/;

  const optimizeDeps = {
    esbuildOptions: {
      plugins: [
        {
          name: "remove-react-native-web-animated",
          setup(build) {
            build.onResolve(
              {
                filter,
              },
              (args) => {
                return { path: args.path, namespace: "proxy-wormify" };
              },
            );

            build.onLoad({ filter: /.*/, namespace: "proxy-wormify" }, (args) => {
              return {
                contents: `export * from "@tamagui/proxy-worm";`,
                loader: "js",
              };
            });
          },
        },
      ],
    },
  } satisfies UserConfig["optimizeDeps"];

  return {
    name: "remove-react-native-web-animated",

    config() {
      return {
        optimizeDeps,
      };
    },
  };
}
