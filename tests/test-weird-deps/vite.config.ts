import { one } from "one/vite";
import type { UserConfig } from "vite";

export default {
  plugins: [
    one({
      deps: {
        "@rn-primitives/slot": {
          "**/*.mjs": ["jsx"],
        },
      },
    }),
  ],
} satisfies UserConfig;
