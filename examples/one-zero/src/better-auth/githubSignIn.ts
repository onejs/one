import { authClient } from './authClient'

export const githubSignIn = async () => {
  await authClient.signIn.social({
    provider: 'github',
  })
}
