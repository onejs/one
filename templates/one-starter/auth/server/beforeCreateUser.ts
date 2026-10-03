import { DEMO_EMAIL, DEMO_USER_ID } from '~/auth/demoIdentity'

export async function beforeCreateUser(user: {
  id: string
  email: string
  name: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  image?: string | null
}) {
  if (user.email.toLowerCase() !== DEMO_EMAIL.toLowerCase()) return
  return {
    data: {
      ...user,
      id: DEMO_USER_ID,
    },
  }
}
