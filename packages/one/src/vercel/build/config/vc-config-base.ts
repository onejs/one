// Documentation - Vercel Build Output v3 Node.js Config
//   https://vercel.com/docs/build-output-api/v3/primitives#node.js-config
export const serverlessVercelNodeJsConfig = {
  environment: {},
  runtime: "nodejs20.x",
  handler: "entrypoint/index.js",
  launcherType: "Nodejs",
  shouldAddHelpers: true,
  shouldAddSourceMapSupport: true,
  // @TODO: We could support edge functions in the future.
  // Requires a larger discusion of how to handle edge functions in general.
  // +ssr-edge.tsx or +edge.tsx down the road.
  //   https://vercel.com/docs/build-output-api/v3/primitives#edge-functions
  // runtime: 'edge',
  // regions: 'all',
  // @TODO: We could support ISR in the future as well.
  // Requires a larger discusion of how to handle ISR in general.
  //   https://vercel.com/docs/build-output-api/v3/primitives#prerender-functions
  // We would need to generate the bypassToken and copy *.html fallback files to the *.func folder.
  //   https://vercel.com/docs/build-output-api/v3/primitives#fallback-static-file
  // bypassToken?: string;
};
