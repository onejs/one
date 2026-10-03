import 'server-only'
import { expo } from '@better-auth/expo'
import { betterAuth } from 'better-auth'
import { bearer, emailOTP } from 'better-auth/plugins'
import { APP_SCHEME } from '~/constants'
import { server, ports } from '~/env'
import { afterCreateUser } from './afterCreateUser'
import { authDatabase } from './authDb'
import { beforeCreateUser } from './beforeCreateUser'
import { APP_NAME } from '~/constants'

export const authServer = betterAuth({
  baseURL: server.BETTER_AUTH_URL,
  basePath: '/api/auth',
  database: authDatabase,
  secret: server.BETTER_AUTH_SECRET,
  advanced: {
    cookiePrefix: APP_SCHEME,
    // one replaces this header with the request socket's address.
    ipAddress: { ipAddressHeaders: ['x-vxrn-peer-address'] },
  },

  session: {
    storeSessionInDatabase: true,
    cookieCache: {
      enabled: true,
      maxAge: 20 * 60,
    },
  },

  emailAndPassword: {
    enabled: process.env.NODE_ENV === 'development',
    autoSignIn: false,
  },

  trustedOrigins: [
    `http://localhost:${ports.web}`,
    `http://localhost:${ports.zero}`,
    `http://127.0.0.1:${ports.web}`,
    `${APP_SCHEME}://`,
  ],

  databaseHooks: {
    user: {
      create: {
        before: beforeCreateUser,
        async after(user) {
          await afterCreateUser(user)
        },
      },
    },
  },

  plugins: [
    // session-token auth only (web cookie + native bearer). no jwt() plugin:
    // Zero validates the session token via getSession, never a JWKS-verified jwt
    // (that fetch fails on the SSR loopback — see auth/server/getZeroAuthData.ts).
    bearer(),
    expo(),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        if (process.env.NODE_ENV === 'development') {
          console.info(`development sign-in code for ${email}: ${otp}`)
          return
        }
        if (!server.RESEND_API_KEY || !server.AUTH_EMAIL_FROM) {
          throw new Error('configure RESEND_API_KEY and AUTH_EMAIL_FROM for email sign-in')
        }
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${server.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: server.AUTH_EMAIL_FROM,
            to: [email],
            subject: `${APP_NAME} sign-in code`,
            text: `Your sign-in code is ${otp}.`,
          }),
        })
        if (!response.ok) throw new Error(`email delivery failed (${response.status})`)
      },
    }),
  ],

  logger: {
    level: 'warn',
  },
})
