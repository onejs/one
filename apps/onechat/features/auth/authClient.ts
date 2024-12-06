import { createAuthClient } from 'better-auth/client'

const authClient = createAuthClient()

export const githubSignIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'github',
  })
  console.log('data', data)
}
