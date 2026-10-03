import { authClient } from '~/auth/client/authClient'

type AuthError = {
  code: string
  title: string
  message: string
}

type Result =
  | { success: true; error?: undefined }
  | {
      success: false
      error: AuthError
    }

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function standardizeBetterAuthError(error: unknown): { code: string; message: string } {
  if (!error || typeof error !== 'object') {
    return { code: 'UNKNOWN', message: 'Unknown authentication error' }
  }
  const maybe = error as { code?: string; statusText?: string; message?: string }
  return {
    code: maybe.code || maybe.statusText || 'UNKNOWN',
    message: maybe.message || maybe.statusText || 'Unknown authentication error',
  }
}

export function validateLoginOtpCode(
  method: 'email',
  to: string,
  timeoutAfterMs = 8000,
): Promise<Result> {
  return Promise.race([
    validateLoginOtpCodeInfinite(method, to),
    sleep(timeoutAfterMs).then(() => {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          title: 'Timed out',
          message: 'Timed out sending OTP code.',
        },
      } satisfies Result
    }),
  ])
}

async function validateLoginOtpCodeInfinite(method: 'email', to: string): Promise<Result> {
  switch (method) {
    case 'email': {
      const { data, error } = await authClient.emailOtp.sendVerificationOtp({
        email: to,
        type: 'sign-in',
      })

      if (data?.success) {
        return { success: true }
      }

      const { code, message } = standardizeBetterAuthError(error)

      if (code === 'INVALID_EMAIL') {
        return {
          success: false,
          error: {
            code,
            title: 'Invalid Email',
            message: `The email address "${to}" is not valid. Please check and try again.`,
          },
        }
      }

      if (code === 'TOO_MANY_REQUESTS' || code === 'RATE_LIMIT_EXCEEDED') {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            title: 'Too Many Attempts',
            message: 'Please wait a minute before trying again.',
          },
        }
      }

      return {
        success: false,
        error: {
          code,
          title: 'An Error Occurred',
          message: `Failed to send OTP: "${message}" (${code}). Please try again.`,
        },
      }
    }
  }
}

export async function otpLogin(method: 'email', email: string, otp: string): Promise<Result> {
  switch (method) {
    case 'email': {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp,
      })

      if (!error) {
        return { success: true }
      }

      const { code, message } = standardizeBetterAuthError(error)

      if (code === 'INVALID_OTP') {
        return {
          success: false,
          error: {
            code,
            title: 'Invalid OTP',
            message: 'The OTP you entered is invalid. Please check the code and try again.',
          },
        }
      }

      if (code === 'OTP_EXPIRED') {
        return {
          success: false,
          error: {
            code,
            title: 'OTP Expired',
            message: 'Your OTP has expired. Please request a new one.',
          },
        }
      }

      return {
        success: false,
        error: {
          code,
          title: 'An Error Occurred',
          message: `Failed to log in: "${message}" (${code}). Please try again.`,
        },
      }
    }
  }
}
