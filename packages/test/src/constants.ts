export const ONLY_TEST_DEV = process.env.TEST_ONLY === 'dev'
export const ONLY_TEST_PROD = process.env.TEST_ONLY === 'prod'

// TODO: replace ONLY_TEST_DEV & ONLY_TEST_PROD with TEST_ENV
export const TEST_ENV = (() => {
  const testEnvFromEnv = process.env.TEST_ENV

  if (!testEnvFromEnv) {
    console.warn('No TEST_ENV provided, defaulting to dev')
    return 'dev'
  }

  switch (testEnvFromEnv.toLowerCase()) {
    case 'dev':
      return 'dev'
    case 'prod':
      return 'prod'
    default:
      throw new Error(`Invalid TEST_ENV: ${testEnvFromEnv}, must be either 'dev' or 'prod'`)
  }
})()
