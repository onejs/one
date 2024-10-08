import { desc, eq, sql } from 'drizzle-orm'
import { getURL, Stack, useLoader, type LoaderProps } from 'one'
import { RefreshControl } from 'react-native'
import { ScrollView } from 'tamagui'
import { db } from '~/code/db/connection'
import { likes, posts, replies, reposts, users } from '~/code/db/schema'
import { FeedCard } from '~/code/feed/FeedCard'
import { PageContainer } from '~/code/ui/PageContainer'

import { feed } from '~/code/data'

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
