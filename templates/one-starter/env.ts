import { createEnv, expected } from '@o/env'

const result = createEnv({
  ports: {
    web: 4200,
    zero: 5049,
    admin: 7677,
  },

  // refresh managed .env.development values so PORT_OFFSET runs do not inherit
  // stale Zero endpoints from a previous default-port run.
  freshDev: true,

  base: {
    BETTER_AUTH_SECRET: expected,
    ZERO_APP_ID: 'one-starter',
    ZERO_MUTATE_FORWARD_COOKIES: 'true',
    ZERO_QUERY_FORWARD_COOKIES: 'true',
    RESEND_API_KEY: '',
    AUTH_EMAIL_FROM: '',
    CLOUDFLARE_R2_ACCESS_KEY: '',
    CLOUDFLARE_R2_SECRET_KEY: '',
    CLOUDFLARE_R2_ENDPOINT: '',
    CLOUDFLARE_R2_PUBLIC_URL: '',
    CLOUDFLARE_R2_BUCKET: '',
  },

  development: ({ ports }) => ({
    // inlined into the native bundle by one's bundler. without it the
    // define falls back to vxrn's default port (8081) and every native API/auth
    // call misses the dev server entirely.
    ONE_SERVER_URL: `http://localhost:${ports.web}`,
    VITE_PROTOCOL: 'http',
    VITE_WEB_HOSTNAME: `localhost:${ports.web}`,
    BETTER_AUTH_SECRET: 'one-starter-dev-secret-change-in-production',
    BETTER_AUTH_URL: `http://localhost:${ports.web}`,
    ZERO_MUTATE_URL: `http://127.0.0.1:${ports.web}/api/zero/push`,
    ZERO_QUERY_URL: `http://127.0.0.1:${ports.web}/api/zero/pull`,
    ALLOW_MISSING_ENV: '1',

  }),

  production: {
    VITE_PROTOCOL: 'https',
    VITE_WEB_HOSTNAME: expected,
    BETTER_AUTH_URL: expected,
    ZERO_MUTATE_URL: '',
    ZERO_QUERY_URL: '',
    CLOUDFLARE_R2_PUBLIC_URL: expected,
    CLOUDFLARE_R2_BUCKET: expected,
  },
})

export const { server, ports, portOffset, production, versions, config: envConfig } = result
result.apply()
if (import.meta.main) result.run()
