import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.ZERO_UPSTREAM_DB,
  }),

  socialProviders: {
    github: {
      clientId: process.env.ONECHAT_GITHUB_CLIENT_ID as string,
      clientSecret: process.env.ONECHAT_GITHUB_CLIENT_SECRET as string,
    },
  },
})
