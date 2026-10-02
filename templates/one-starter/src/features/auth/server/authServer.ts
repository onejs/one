import { betterAuth } from 'better-auth'
import { admin, bearer, jwt } from 'better-auth/plugins'
import { DOMAIN } from '~/constants/app'
import { database } from '~/database/database'
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '~/server/env-server'
import { APP_SCHEME } from '../constants'
import { afterCreateUser } from './afterCreateUser'
export const authServer = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  database,
  session: {
    freshAge: 60 * 60 * 24 * 2,
    storeSessionInDatabase: true,
  },
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [`https://${DOMAIN}`, BETTER_AUTH_URL, `${APP_SCHEME}://`],
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          await afterCreateUser(user)
        },
      },
    },
  },
  plugins: [
    jwt({
      jwt: {
        expirationTime: '15m',
      },
      jwks: {
        // compat with zero
        keyPairConfig: {
          alg: 'EdDSA',
          crv: 'Ed25519',
        },
      },
    }),
    bearer(),
    admin(),
  ],
  logger: {
    level: 'warn',
    log(level, message, ...args) {
      console.info(level, message, ...args)
    },
  },
  account: {
    accountLinking: {
      allowDifferentEmails: true,
    },
  },
})
