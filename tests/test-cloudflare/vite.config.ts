import { one } from "one/vite";

export default {
  plugins: [
    one({
      web: {
        deploy: "cloudflare",
      },
    }),
  ],
};
