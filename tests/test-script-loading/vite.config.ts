import { one } from "one/vite";
import type { UserConfig } from "vite";

export default {
  plugins: [
    one({
      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
      web: {
        defaultRenderMode: "ssg",
        experimental_scriptLoading: "after-lcp",
      },
    }),
  ],
} satisfies UserConfig;
