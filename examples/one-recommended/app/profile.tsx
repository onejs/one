import { ScrollView, YStack, Text, SizableStack, XStack } from 'tamagui'
import { getURL, type LoaderProps, useLoader } from 'one'
import { FeedCard } from '~/code/feed/FeedCard'
import { Image } from '~/code/ui/Image'
import { PageContainer } from '~/code/ui/PageContainer'
import { Repeat2 } from '@tamagui/lucide-icons'
import { db } from '~/code/db/connection'
import { posts, reposts, users, likes, replies } from '~/code/db/schema'
import { eq, sql, desc } from 'drizzle-orm'

export async function loader({ path }: LoaderProps) {
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
      throw new Error('No users found in the database')
    }

    const USER_ID = randomUser[0].id

    const url = new URL(getURL() + path)
    const page = Number(url.searchParams.get('page') || '1')
    const limit = Number(url.searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const postsQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        createdAt: sql<Date>`${posts.createdAt} as created_at`,
        user: {
          name: users.username,
          avatar: users.avatarUrl,
        },
        likesCount:
          sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`.as(
            'likesCount'
          ),
        repliesCount:
          sql<number>`(SELECT COUNT(*) FROM ${replies} WHERE ${replies.postId} = ${posts.id})`.as(
            'repliesCount'
          ),
        repostsCount:
          sql<number>`(SELECT COUNT(*) FROM ${reposts} WHERE ${reposts.postId} = ${posts.id})`.as(
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
        createdAt: sql`${reposts.createdAt} as created_at`,
        user: {
          name: users.username,
          avatar: users.avatarUrl,
        },
        likesCount:
          sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`.as(
            'likesCount'
          ),
        repliesCount:
          sql<number>`(SELECT COUNT(*) FROM ${replies} WHERE ${replies.postId} = ${posts.id})`.as(
            'repliesCount'
          ),
        repostsCount:
          sql<number>`(SELECT COUNT(*) FROM ${reposts} WHERE ${reposts.postId} = ${posts.id})`.as(
            'repostsCount'
          ),
        type: sql`'repost'`.as('type'),
      })
      .from(reposts)
      .leftJoin(posts, eq(posts.id, reposts.postId))
      .leftJoin(users, eq(users.id, posts.userId))
      .where(eq(reposts.userId, USER_ID))

    const combinedFeedQuery = postsQuery
      .unionAll(repostsQuery as unknown as typeof postsQuery)
      .orderBy(desc(sql`created_at`))
      .limit(limit)
      .offset(offset)

    const combinedFeed = await combinedFeedQuery

    return { profileFeed: combinedFeed, userData: randomUser[0] }
  } catch (error) {
    console.error(error)
    throw new Error(`Failed to fetch profile feed: ${(error as Error).message}`)
  }
}

export default function ProfilePage() {
  const { profileFeed, userData } = useLoader(loader)

  return (
    <PageContainer>
      <ScrollView>
        <YStack position="relative" width="100%" height={180} overflow="hidden">
          <Image
            position="absolute"
            t={0}
            r={0}
            b={0}
            l={0}
            src="https://placecats.com/millie/300/200"
          />
          <Image
            position="absolute"
            b="$4"
            l="$4"
            width={100}
            height={100}
            rounded={100}
            src={userData.avatar || ''}
            borderWidth={1}
            borderColor="$color1"
            shadowColor="rgba(0,0,0,0.5)"
            shadowRadius={10}
            shadowOffset={{
              width: 0,
              height: 0,
            }}
          />
        </YStack>

        {profileFeed.map((post) => {
          if (post.type === 'repost') {
            return (
              <YStack
                key={post.id}
                p="$4"
                borderColor="$borderColor"
                borderWidth={1}
                rounded="$4"
                mb="$4"
                mt="$4"
              >
                <XStack gap="$2" mb="$2">
                  <Repeat2 size={12} color="$accent1" />
                  <Text fontFamily="$body" color="$accent1" fontSize={10}>
                    Reposted by {userData.name}
                  </Text>
                </XStack>
                <FeedCard {...post} />
              </YStack>
            )
          }
          return <FeedCard key={post.id} {...post} />
        })}
      </ScrollView>
    </PageContainer>
  )
}
