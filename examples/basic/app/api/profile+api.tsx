import { db } from '~/db/connection'
import { posts, reposts, users, likes, replies } from '~/db/schema'
import { eq, sql, desc } from 'drizzle-orm'

export async function GET(request: Request): Promise<Response> {
  // Hardcoded user ID for the profile feed
  const USER_ID = 759

  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') || '1')
  const limit = Number(url.searchParams.get('limit') || '10')
  const offset = (page - 1) * limit

  try {
    const postsQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        createdAt: posts.createdAt,
        user: {
          name: users.username,
          avatar: users.avatarUrl,
        },
        likesCount: sql`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`.as(
          'likesCount'
        ),
        repliesCount:
          sql`(SELECT COUNT(*) FROM ${replies} WHERE ${replies.postId} = ${posts.id})`.as(
            'repliesCount'
          ),
        repostsCount:
          sql`(SELECT COUNT(*) FROM ${reposts} WHERE ${reposts.postId} = ${posts.id})`.as(
            'repostsCount'
          ),
        type: sql`'post'`.as('type'),
      })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.userId))
      .where(eq(posts.userId, USER_ID))

    const repostsQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        createdAt: reposts.createdAt,
        user: {
          name: users.username,
          avatar: users.avatarUrl,
        },
        likesCount: sql`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`.as(
          'likesCount'
        ),
        repliesCount:
          sql`(SELECT COUNT(*) FROM ${replies} WHERE ${replies.postId} = ${posts.id})`.as(
            'repliesCount'
          ),
        repostsCount:
          sql`(SELECT COUNT(*) FROM ${reposts} WHERE ${reposts.postId} = ${posts.id})`.as(
            'repostsCount'
          ),
        type: sql`'repost'`.as('type'),
      })
      .from(reposts)
      .leftJoin(posts, eq(posts.id, reposts.postId))
      .leftJoin(users, eq(users.id, posts.userId))
      .where(eq(reposts.userId, USER_ID))

    const combinedFeedQuery = postsQuery
      .unionAll(repostsQuery)
      .orderBy(desc(sql`created_at`))
      .limit(limit)
      .offset(offset)

    const combinedFeed = await combinedFeedQuery

    const userDataQuery = db
      .select({
        id: users.id,
        name: users.username,
        avatar: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, USER_ID))
      .limit(1)

    const userData = await userDataQuery

    return new Response(JSON.stringify({ profileFeed: combinedFeed, userData: userData[0] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch profile feed', details: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
