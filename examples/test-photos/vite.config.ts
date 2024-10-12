import type { UserConfig } from "vite";
import { one } from "one/vite";
import { tamaguiPlugin } from "@tamagui/vite-plugin";

export default {
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
      components: ["tamagui", "expo-camera"],
      config: "./config/tamagui.config.ts",
      outputCSS: "./code/styles/tamagui.css",
    }),
  ],
} satisfies UserConfig;
