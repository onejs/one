import type { User } from 'better-auth'
import { getDb } from '~/database'
import { userPublic, userState } from '~/database/schema-public'

export async function afterCreateUser(user: User) {
  await getDb().transaction(async (tx) => {
    await tx.insert(userPublic).values({
      id: user.id,
      name: user.name,
      image: user.image,
      joinedAt: user.createdAt.toISOString(),
    })
    await tx.insert(userState).values({ userId: user.id })
  })
}
