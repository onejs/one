// Documentation - Vercel Build Output v3 Config
//   https://vercel.com/docs/build-output-api/v3/configuration#config.json-supported-properties
export const vercelBuildOutputConfigBase = {
  version: 3,
  // Note: cleanUrls is NOT supported in the Build Output API config.json
  // Users must add "cleanUrls": true to their vercel.json at project root
  // https://vercel.com/docs/build-output-api/v3/configuration#routes
  routes: [
    // Not sure if we really need this, but having this seems to break the 'rewrite's we will add to handle dynamic routes.
    // {
    //   src: '/(.*)',
    //   status: 200,
    // },
  ],
}
