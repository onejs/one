import { db } from '~/db/connection'
import { posts, users, likes, replies, reposts } from '~/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('postId')

  if (!id) {
    return new Response(JSON.stringify({ error: 'Invalid post ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const post = await db
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
      })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.userId))
      .where(eq(posts.id, Number(id)))
      .limit(1)

    if (post.length === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const repliesData = await db
      .select({
        id: replies.id,
        content: replies.content,
        createdAt: replies.createdAt,
        user: {
          name: users.username,
          avatar: users.avatarUrl,
        },
      })
      .from(replies)
      .leftJoin(users, eq(users.id, replies.userId))
      .where(eq(replies.postId, Number(id)))

    const response = {
      ...post[0],
      replies: repliesData,
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch post', details: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
