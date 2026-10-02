import { DEMO_EMAIL, DEMO_PASSWORD } from '~/constants/app'
import { authClient } from './authClient'
export const signInAsDemo = () =>
  authClient.signIn.email({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })
