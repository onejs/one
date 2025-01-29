import { betterAuth } from 'better-auth'
import { Pool } from 'pg'
import { jwt, bearer } from 'better-auth/plugins'

// make sure not set during production builds so we can dynamically set it
const DATABASE_URL = process.env.ZERO_UPSTREAM_DB

console.info('DATABASE_URL', DATABASE_URL)

export const auth = betterAuth({
  database: new Pool({
    connectionString: DATABASE_URL,
  }),

  trustedOrigins: ['https://start.chat'],

  plugins: [
    jwt({
      jwt: {
        expirationTime: '3y',
      },

      jwks: {
        // default
        keyPairConfig: { alg: 'EdDSA', crv: 'Ed25519' },
      },
    }),

    bearer(),
  ],

  socialProviders: {
    github: {
      clientId: process.env.ONECHAT_GITHUB_CLIENT_ID as string,
      clientSecret: process.env.ONECHAT_GITHUB_CLIENT_SECRET as string,
    },
  },
})
