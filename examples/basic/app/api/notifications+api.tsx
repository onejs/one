import { db } from '~/db/connection'
import { likes, reposts, users, posts, follows } from '~/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

type Notification = {
  action: 'like' | 'follow' | 'repost'
  fromUser: {
    username: string
    userLink: string
    avatar: string
  }
  post: {
    postLink: string
    content: string
  } | null
  createdAt: string
}

type NotificationsResponse = {
  notifications: Notification[]
  total: number
  page: number
  limit: number
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') || '1')
  const limit = Number(url.searchParams.get('limit') || '10')
  const offset = (page - 1) * limit

  try {
    // Fetch a random user from the database
    const randomUserQuery = db
      .select({
        id: users.id,
        name: users.username,
        avatar: users.avatarUrl,
      })
      .from(users)
      .orderBy(sql`RANDOM()`)
      .limit(1)

    const randomUser = await randomUserQuery

    if (randomUser.length === 0) {
      return new Response(JSON.stringify({ error: 'No users found in the database' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const USER_ID = randomUser[0].id

    const notificationsQuery = db
      .select({
        username: users.username,
        avatar: users.avatarUrl,
        userId: users.id,
        postId: posts.id,
        postContent: posts.content,
        createdAt: sql`${likes.createdAt} as created_at`, // Use snake_case for column names
        actionType: sql`'like'`.as('actionType'),
      })
      .from(likes)
      .leftJoin(users, eq(users.id, likes.userId))
      .leftJoin(posts, eq(posts.id, likes.postId))
      .where(eq(posts.userId, USER_ID))
      .union(
        db
          .select({
            username: users.username,
            avatar: users.avatarUrl,
            userId: users.id,
            postId: posts.id,
            postContent: posts.content,
            createdAt: sql`${reposts.createdAt} as created_at`, // Use snake_case for column names
            actionType: sql`'repost'`.as('actionType'),
          })
          .from(reposts)
          .leftJoin(users, eq(users.id, reposts.userId))
          .leftJoin(posts, eq(posts.id, reposts.postId))
          .where(eq(posts.userId, USER_ID))
      )
      .union(
        db
          .select({
            username: users.username,
            avatar: users.avatarUrl,
            userId: users.id,
            postId: sql`NULL`.as('postId'),
            postContent: sql`NULL`.as('postContent'),
            createdAt: sql`${follows.createdAt} as created_at`, // Use snake_case for column names
            actionType: sql`'follow'`.as('actionType'),
          })
          .from(follows)
          .leftJoin(users, eq(users.id, follows.followerId))
          .where(eq(follows.followingId, USER_ID))
      )
      .orderBy(desc(sql`created_at`)) // Use the common alias for created_at
      .limit(limit)
      .offset(offset)

    const notifications = await notificationsQuery

    const formattedNotifications: Notification[] = notifications.map((notification) => ({
      action: notification.actionType,
      fromUser: {
        username: notification.username,
        userLink: `/profile/${notification.userId}`,
        avatar: notification.avatar,
      },
      post: notification.postId
        ? {
            postLink: `/post/${notification.postId}`,
            content: notification.postContent,
          }
        : null,
      createdAt: notification.createdAt,
    }))

    const response: NotificationsResponse = {
      notifications: formattedNotifications,
      total: notifications.length,
      page,
      limit,
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
