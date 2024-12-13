import { betterAuth } from 'better-auth'
import { Pool } from 'pg'
import { jwt, bearer } from 'better-auth/plugins'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.ZERO_UPSTREAM_DB,
  }),

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
