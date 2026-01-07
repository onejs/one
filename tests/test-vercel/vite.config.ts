import { one } from "one/vite";
import type { UserConfig } from "vite";

export default {
  plugins: [
    one({
      web: {
        deploy: "vercel",
      },

      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
    }),
  ],
} satisfies UserConfig;
