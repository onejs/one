// Documentation - Vercel Build Output v3 Config
//   https://vercel.com/docs/build-output-api/v3/configuration#config.json-supported-properties
export const vercelBuildOutputConfig = {
  version: 3,
  // https://vercel.com/docs/build-output-api/v3/configuration#routes
  routes: [
    {
      src: '/(.*)',
      status: 200,
    },
  ],
}
