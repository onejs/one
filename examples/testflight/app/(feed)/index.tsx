import { Stack } from 'one'
import { RefreshControl } from 'react-native'
import { ScrollView } from 'tamagui'
import { FeedCard } from '~/src/feed/FeedCard'
import { PageContainer } from '~/src/ui/PageContainer'

import { feed as allFeed } from '~/src/data'

const feed = allFeed.slice(0, 16)

export function FeedPage() {
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
          {feed.map((item) => (
            <FeedCard key={item.id} {...item} />
          ))}
        </ScrollView>
      </PageContainer>
    </>
  )
}
