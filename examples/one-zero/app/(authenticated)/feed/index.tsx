import { Stack } from 'one'
import { useQuery } from 'one/zero'
import { RefreshControl } from 'react-native'
import { ScrollView } from 'tamagui'
import { FeedCard, feedCardQuery } from '~/features/feed/FeedCard'
import { PageContainer } from '~/features/ui/PageContainer'
import { zero } from '~/features/zero/client'

const feedQuery = zero.query.posts
  .orderBy('created_at', 'desc')
  .limit(20)
  .sub((q) => feedCardQuery(q.parent.id))

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
            <FeedCard key={item.id} id={item.id} />
          ))}
        </ScrollView>
      </PageContainer>
    </>
  )
}
