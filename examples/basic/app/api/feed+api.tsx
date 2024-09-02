import { db } from '~/db/connection'
import { posts, users } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') || '1')
  const limit = Number(url.searchParams.get('limit') || '10')

  const offset = (page - 1) * limit

  try {
    const feed = await db
      .select({
        id: posts.id,
        content: posts.content,
        createdAt: posts.createdAt,
        user: {
          name: users.username,
          avatar: users.avatarUrl,
        },
      })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.userId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)

    return new Response(JSON.stringify(feed), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch feed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
