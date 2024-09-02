import { RefreshControl } from 'react-native'
import { ScrollView } from 'tamagui'
import { useLoader } from 'vxs'
import { feedData } from '~/features/feed/data'
import { FeedCard } from '~/features/feed/FeedCard'
import { PageContainer } from '~/features/ui/PageContainer'

export function loader() {
  return {
    feed: feedData,
  }
}

export default function FeedPage() {
  const { feed } = useLoader(loader)

  return (
    <>
      <PageContainer>
        <ScrollView maxHeight="100%">
          <RefreshControl refreshing={false} />
          {feed.map((item, i) => {
            return <FeedCard key={i} {...item} />
          })}
        </ScrollView>
      </PageContainer>
    </>
  )
}
