import type { UserConfig } from "vite";
import { one } from "one/vite";
import { tamaguiPlugin } from "@tamagui/vite-plugin";

export default {
  // esbuild: {
  //   include: /\.(js|jsx|ts|tsx)$/,
  // },

  // optimizeDeps: {
  //   include: [
  //     'expo-camera'
  //   ]
  // },

  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },

  plugins: [
    one({
      web: {
        deploy: "vercel",
        defaultRenderMode: "ssg",
      },

      app: {
        key: "One",
      },
    }),

    tamaguiPlugin({
      optimize: true,
      components: [
        "tamagui",
        // "@tamagui-extras/file",
        // "@tamagui-extras/core",
        "expo-camera",
      ],
      config: "./config/tamagui.config.ts",
      outputCSS: "./code/styles/tamagui.css",
    }),
  ],
} satisfies UserConfig;
