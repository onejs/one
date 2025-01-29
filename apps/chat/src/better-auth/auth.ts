import { betterAuth } from 'better-auth'
import { bearer, jwt } from 'better-auth/plugins'
import { Pool } from 'pg'

// make sure not set during production builds so we can dynamically set it
const DATABASE_URL = process.env.ZERO_UPSTREAM_DB

export const auth = betterAuth({
  database: new Pool({
    connectionString: DATABASE_URL,
  }),

  trustedOrigins: ['https://start.chat', 'http://localhost'],

  plugins: [
    jwt({
      jwt: {
        expirationTime: '3y',
      },
    }),

    bearer(),
  ],

  socialProviders: {
    github: {
      enabled: true,
      clientId: process.env.ONECHAT_GITHUB_CLIENT_ID!,
      clientSecret: process.env.ONECHAT_GITHUB_CLIENT_SECRET!,
    },
  },
})
