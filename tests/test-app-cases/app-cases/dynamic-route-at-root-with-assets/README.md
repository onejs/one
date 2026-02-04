# catch-all-route-at-root-with-assets

This tests whether assets and `/public` files are served correctly when a catch-all (`/[...something].tsx`) route is defined at the root level.

One doesn't support customizing the `/public` directory (yet), so we are testing with the `/public` dir located at the app root (next to the `package.json`) instead of having a `public` dir inside this app-case.
