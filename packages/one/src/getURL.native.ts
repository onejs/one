import { getDevServer } from "./getDevServer";

let hasWarnedOnce = false;

export function getURL() {
  let url = process.env.ONE_SERVER_URL;

  if (__DEV__) {
    // We'll be using the development server in development mode, but we still need to warn the user to set SERVER_URL for things to work in production.
    if (!url) {
      if (hasWarnedOnce) {
        hasWarnedOnce = true;
        console.warn(
          `The ONE_SERVER_URL environment variable is not set. While things will work in development mode as we'll be using your development server, you should still set ONE_SERVER_URL in your .env file for your production builds to work.`,
        );
      }
    }

    const { url: devServerUrl } = getDevServer();
    url = devServerUrl;
  }

  if (!url) {
    // Provide a dummy URL so things won't crash.
    url = "http://one-server.example.com";
  }

  return url.replace(/\/+$/, ""); // remove trailing slash for consistency with web
}
