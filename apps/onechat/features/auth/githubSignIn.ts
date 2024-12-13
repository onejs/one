import { authClient } from './authClient'

export const githubSignIn = async () => {
  const data = await authClient.signIn.social({
    provider: 'github',
  })
}
