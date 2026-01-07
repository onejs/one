import { tamaguiPlugin } from "@tamagui/vite-plugin";
import type { UserConfig } from "vite";
import { one, resolvePath } from "one/vite";

export default {
  resolve: {
    alias: [
      {
        find: "@docsearch/react",
        replacement: resolvePath("@docsearch/react"),
      },
      {
        // use lightweight svg for web (~2KB vs ~50KB)
        find: "react-native-svg",
        replacement: "@tamagui/react-native-svg",
      },
    ],
  },

  ssr: {
    noExternal: true,
    external: ["@vxrn/mdx"],
  },

  define: {
    "process.env.TAMAGUI_DISABLE_NO_THEME_WARNING": '"1"',
  },

  plugins: [
    one({
      react: {
        compiler: process.env.NODE_ENV === "production",
      },

      web: {
        inlineLayoutCSS: true,
      },

      router: {
        experimental: {
          typedRoutesGeneration: "runtime",
        },
      },
    }),

    tamaguiPlugin({
      optimize: process.env.NODE_ENV === "production",
      useReactNativeWebLite: true,
      components: ["tamagui"],
      config: "./config/tamagui.config.ts",
      outputCSS: "./app/tamagui.css",
    }),
  ],
} satisfies UserConfig;
