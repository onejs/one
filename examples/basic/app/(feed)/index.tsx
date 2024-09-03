import { RefreshControl } from 'react-native'
import { ScrollView } from 'tamagui'
import { Stack, useLoader } from 'vxs'
import { FeedCard } from '~/features/feed/FeedCard'
import { feedData } from '~/features/feed/data'
import { PageContainer } from '~/features/ui/PageContainer'
import { fetchFeed } from '~/data/feed'

export async function loader() {
  const data = await fetchFeed({
    queryKey: ['feed', 1, 40],
  })
  return {
    feed: data,
  }
}

export default function FeedPage() {
  const { feed } = useLoader(loader)
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
          {[...feedData, ...feed].map((item, i) => {
            return <FeedCard key={i} {...item} />
          })}
        </ScrollView>
      </PageContainer>
    </>
  )
}
