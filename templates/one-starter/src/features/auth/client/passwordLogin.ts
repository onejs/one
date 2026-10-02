import { authClient } from './authClient'
type Result =
  | {
      success: true
      error?: undefined
    }
  | {
      success: false
      error: {
        code: string
        title: string
        message: string
      }
    }

/**
 * Login with email and password.
 */
export async function passwordLogin(email: string, password: string): Promise<Result> {
  const { error } = await authClient.signIn.email({
    email,
    password,
  })
  if (!error) {
    return {
      success: true,
    }
  }
  const { code, message } = standardizeBetterAuthError(error)
  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return {
        success: false,
        error: {
          code,
          title: 'Incorrect Password',
          message: 'The password you entered is incorrect. Please try again.',
        },
      }
    default: {
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
export function standardizeBetterAuthError(error: unknown) {
  let code = 'UNKNOWN'
  let message = 'Unknown error'
  if (error && typeof error === 'object') {
    const errorCode = Reflect.get(error, 'code')
    if (errorCode && typeof errorCode === 'string') {
      code = errorCode
    }
    const errorMessage = Reflect.get(error, 'message')
    if (errorMessage && typeof errorMessage === 'string') {
      message = errorMessage
    }
  }
  return {
    code,
    message,
  }
}
