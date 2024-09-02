import { useEffect } from 'react'
import { RefreshControl } from 'react-native'
import { ScrollView } from 'tamagui'
import { useLoader, useNavigation } from 'vxs'
import { FeedCard } from '~/features/feed/FeedCard'
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
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions({ title: 'Feed' })
  }, [navigation])

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
