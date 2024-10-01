import { isWeb } from 'tamagui'
import { type Href, SafeAreaView, useLoader, type LoaderProps, getURL } from 'one'
import { NotificationCard } from '~/code/notifications/NotificationCard'
import { PageContainer } from '~/code/ui/PageContainer'
import { db } from '~/code/db/connection'
import { likes, reposts, users, posts, follows } from '~/code/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

type Notification = {
  action: 'like' | 'follow' | 'repost'
  fromUser: {
    username: string
    userLink: Href
    avatar: string
  }
  post: {
    postLink: Href
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

export async function loader({ path }: LoaderProps): Promise<NotificationsResponse> {
  try {
    const url = new URL(getURL() + path)
    const page = Number(url.searchParams.get('page') || '1')
    const limit = Number(url.searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

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
      throw new Error('No users found in the database')
    }

    const USER_ID = randomUser[0].id

    const notificationsQuery = db
      .select({
        username: users.username,
        avatar: users.avatarUrl,
        userId: users.id,
        postId: posts.id,
        postContent: posts.content,
        createdAt: sql`${likes.createdAt} as created_at`,
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
            createdAt: sql`${reposts.createdAt} as created_at`,
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
            createdAt: sql`${follows.createdAt} as created_at`,
            actionType: sql`'follow'`.as('actionType'),
          })
          .from(follows)
          .leftJoin(users, eq(users.id, follows.followerId))
          .where(eq(follows.followingId, USER_ID))
      )
      .orderBy(desc(sql`created_at`))
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

    return {
      notifications: formattedNotifications,
      total: notifications.length,
      page,
      limit,
    }
  } catch (error) {
    console.error(error)
    throw new Error(`Failed to fetch notifications: ${(error as Error).message}`)
  }
}

export default function NotificationsPage() {
  const { notifications } = useLoader(loader)
  const feed = notifications.map((item, i) => {
    return <NotificationCard key={i} {...item} />
  })

  return (
    <>
      <PageContainer>{isWeb ? feed : <SafeAreaView>{feed}</SafeAreaView>}</PageContainer>
    </>
  )
}
