import { RefreshControl } from 'react-native'
import { ScrollView } from 'tamagui'
import { Stack } from 'vxs'
import { FeedCard } from '~/features/feed/FeedCard'
import { PageContainer } from '~/features/ui/PageContainer'
import { zero } from '~/features/zero/client'
import { useQuery } from '~/features/zero/query'

export const loader = () => feedQuery

const feedQuery = zero.query.posts
  .orderBy('created_at', 'desc')
  .limit(20)
  .related('user', (q) => q.limit(1))

export function FeedPage() {
  const posts = useQuery(feedQuery)

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Feed',
        }}
      />

      <PageContainer>
        <ScrollView maxHeight="100%">
          <RefreshControl refreshing={false} />
          {posts.map((item) => (
            <FeedCard key={item.id} {...item} />
          ))}
        </ScrollView>
      </PageContainer>
    </>
  )
}
