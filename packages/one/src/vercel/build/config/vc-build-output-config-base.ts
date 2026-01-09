// Documentation - Vercel Build Output v3 Config
//   https://vercel.com/docs/build-output-api/v3/configuration#config.json-supported-properties
export const vercelBuildOutputConfigBase = {
  version: 3,
  // Enable clean URLs to serve .html files without extension
  // e.g., /about will serve about.html, visiting /about.html redirects to /about
  // https://vercel.com/docs/build-output-api/v3/configuration#cleanurls
  cleanUrls: true,
  // https://vercel.com/docs/build-output-api/v3/configuration#routes
  routes: [
    // Not sure if we really need this, but having this seems to break the 'rewrite's we will add to handle dynamic routes.
    // {
    //   src: '/(.*)',
    //   status: 200,
    // },
  ],
}
