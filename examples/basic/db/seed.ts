import { db } from './connection'
import { users, posts, follows, likes, reposts, replies } from './schema'
import { faker } from '@faker-js/faker'

const seed = async () => {
  try {
    console.info('Starting the seeding process...')

    // Clear existing data
    console.info('Clearing existing data...')
    await db.delete(replies)
    await db.delete(reposts)
    await db.delete(likes)
    await db.delete(follows)
    await db.delete(posts)
    await db.delete(users)
    console.info('Existing data cleared.')

    // Insert users and return their IDs
    console.info('Generating 100 users with fake data...')
    const userIds: { id: number }[] = await db
      .insert(users)
      .values(
        Array.from({ length: 100 }).map(() => ({
          username: faker.internet.userName(),
          email: faker.internet.email(),
          passwordHash: faker.internet.password(),
          avatarUrl: `https://i.pravatar.cc/150?u=${faker.internet.email()}`,
        }))
      )
      .returning({ id: users.id })
    console.info('100 users generated.')

    // Insert posts
    console.info('Generating 10 posts for each user...')
    const postPromises = userIds.flatMap((user) => {
      console.info(`Generating 10 posts for user ${user.id}`)
      return Array.from({ length: 10 }).map(() => {
        return db.insert(posts).values({
          userId: user.id,
          content: faker.lorem.sentence(),
          createdAt: faker.date.recent({ days: 1 }), // Random date within the last 1 day
        })
      })
    })

    await Promise.all(postPromises)
    console.info('Posts generated.')

    // Fetch all post IDs
    console.info('Fetching all post IDs...')
    const allPostIds: { id: number }[] = await db.select({ id: posts.id }).from(posts)

    // Insert follows
    console.info('Each user follows 10 other users...')
    const followPromises = userIds.flatMap((follower) => {
      const followingIds = faker.helpers.arrayElements(userIds, 10)
      console.info(`User ${follower.id} follows ${followingIds.length} users`)
      return followingIds.map((following) => {
        return db.insert(follows).values({
          followerId: follower.id,
          followingId: following.id,
          createdAt: faker.date.recent({ days: 1 }), // Random date within the last 1 day
        })
      })
    })

    await Promise.all(followPromises)
    console.info('Follows inserted.')

    // Insert likes
    console.info('Each user likes 150 random posts...')
    const likePromises = userIds.flatMap((user) => {
      const shuffledPostIds = faker.helpers.shuffle(allPostIds)
      const postIds = shuffledPostIds.slice(0, 150)
      console.info(`User ${user.id} likes ${postIds.length} posts`)
      return postIds.map((post) => {
        return db.insert(likes).values({
          userId: user.id,
          postId: post.id,
          createdAt: faker.date.recent({ days: 1 }), // Random date within the last 1 day
        })
      })
    })

    await Promise.all(likePromises)
    console.info('Likes inserted.')

    // Insert reposts
    console.info('Each user reposts 10 random posts...')
    const repostPromises = userIds.flatMap((user) => {
      const shuffledPostIds = faker.helpers.shuffle(allPostIds)
      const postIds = shuffledPostIds.slice(0, 10)
      console.info(`User ${user.id} reposts ${postIds.length} posts`)
      return postIds.map((post) => {
        console.info(`User ${user.id} reposts post ${post.id}`)
        return db.insert(reposts).values({
          userId: user.id,
          postId: post.id,
          createdAt: faker.date.recent({ days: 1 }), // Random date within the last 1 day
        })
      })
    })

    await Promise.all(repostPromises)
    console.info('Reposts inserted.')

    // Insert replies
    console.info('Each user replies to 20 random posts...')
    const replyPromises = userIds.flatMap((user) => {
      const shuffledPostIds = faker.helpers.shuffle(allPostIds)
      const postIds = shuffledPostIds.slice(0, 20)
      console.info(`User ${user.id} replies to ${postIds.length} posts`)
      return postIds.map((post) => {
        return db.insert(replies).values({
          userId: user.id,
          postId: post.id,
          content: faker.lorem.sentence(),
          createdAt: faker.date.recent({ days: 1 }), // Random date within the last 1 day
        })
      })
    })

    await Promise.all(replyPromises)
    console.info('Replies inserted.')

    console.info('Seeding completed successfully.')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding data:', error)
    process.exit(1)
  }
}

seed()
