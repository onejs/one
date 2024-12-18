import { betterAuth } from 'better-auth'
import { bearer, jwt } from 'better-auth/plugins'
import * as PG from 'pg'

export const auth = betterAuth({
  database: new PG.Pool({
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
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
})
