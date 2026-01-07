export const ONLY_TEST_DEV = process.env.TEST_ONLY === 'dev'
export const ONLY_TEST_PROD = process.env.TEST_ONLY === 'prod'

// TODO: replace ONLY_TEST_DEV & ONLY_TEST_PROD with TEST_ENV
export const TEST_ENV = (() => {
  const testEnvFromEnv = process.env.TEST_ENV

  if (!testEnvFromEnv) {
    if (process.env.TEST_ONLY === 'dev') {
      // Not now, we should remove ONLY_TEST_DEV before showing this warning
      // console.warn('TEST_ONLY=dev is deprecated, use TEST_ENV=dev instead')
      return 'dev'
    }

    if (process.env.TEST_ONLY === 'prod') {
      // Not now, we should remove ONLY_TEST_PROD before showing this warning
      // console.warn('TEST_ONLY=prod is deprecated, use TEST_ENV=prod instead')
      return 'prod'
    }

    console.warn('No TEST_ENV provided, defaulting to dev')

    return 'dev'
  }

  switch (testEnvFromEnv.toLowerCase()) {
    case 'dev':
      return 'dev'
    case 'prod':
      return 'prod'
    default:
      throw new Error(
        `Invalid TEST_ENV: ${testEnvFromEnv}, must be either 'dev' or 'prod'`
      )
  }
})()
