import { useRef, type ElementRef } from 'react'
import { Stack } from 'one'
import { RefreshControl } from 'react-native'
import { useScrollToTop } from '@react-navigation/native'
import { ScrollView } from 'tamagui'
import { FeedCard } from '~/code/feed/FeedCard'
import { PageContainer } from '~/code/ui/PageContainer'

import { feed as allFeed } from '~/code/data'

const feed = allFeed.slice(0, 16)

export function FeedPage() {
  const scrollViewRef = useRef<ElementRef<typeof ScrollView>>(null)
  useScrollToTop(scrollViewRef)

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Feed',
        }}
      />

      <PageContainer>
        <ScrollView ref={scrollViewRef} maxHeight="100%">
          <RefreshControl refreshing={false} />
          {feed.map((item) => (
            <FeedCard key={item.id} {...item} />
          ))}
        </ScrollView>
      </PageContainer>
    </>
  )
}
