import { useCallback, useState } from 'react'
import { View, YStack } from 'tamagui'
import { allPosts } from '~/data/post/queries'
import { useQuery } from '~/data/zero-client'
import { AccountToolbarButton } from '~/features/account/AccountToolbarButton'
import { APP_FEED_HREF, APP_FEED_ROUTE_NAME } from '~/features/app/routes'
import { useTabAction } from '~/features/app/tabAction'
import { CreatePostDialog } from '~/interface/feed/CreatePostDialog'
import { PostCard } from '~/interface/feed/PostCard'
import { Icons } from '~/interface/icons'
import { Plus } from '~/interface/icons/lucide/Plus'
import { EmptyState } from '~/interface/layout/EmptyState'
import { PageVirtualList } from '~/interface/layout/PageVirtualList'
import type { PostWithLatestComment } from '~/types'

export default function FeedPage() {
  const [posts] = useQuery(allPosts, { pageSize: 30, cursor: null })
  const [createOpen, setCreateOpen] = useState(false)
  // the feed's primary action, drawn beside the tab bar while this tab is focused.
  useTabAction(APP_FEED_ROUTE_NAME, {
    label: 'Create',
    href: APP_FEED_HREF,
    onPress: () => setCreateOpen(true),
    icon: Plus,
    sfSymbol: 'plus',
    materialSymbol: 'add',
  })

  // this feed is intentionally unbounded, so it is the rare screen that earns
  // virtualization. ordinary bounded collections use PageScrollView and map.
  // each row carries the centered max-width column so the list stays full-bleed.
  const renderItem = useCallback(
    (item: PostWithLatestComment, index: number) => (
      <YStack width="100%" maxW={640} self="center" px="13px web:16px" pb={13}>
        <PostCard post={item} index={index} />
      </YStack>
    ),
    [],
  )

  const empty = (
    <YStack width="100%" maxW={640} self="center" px={13}>
      <EmptyState
        icon={<Icons.Messages size={40} color="color-11" />}
        title="Nothing here yet"
        description="Use Create to start the conversation — your first entry takes a few seconds."
      />
    </YStack>
  )

  return (
    <View flex={1} bg="background">
      {/* the permanent settings entry, mounted in the root's content so it
          configures this tab's own navigation bar. null on web. */}
      <AccountToolbarButton />
      <PageVirtualList
        items={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentPaddingBottom={36}
        contentPaddingTop={12}
        estimatedItemHeight={480}
        showsVerticalScrollIndicator={false}
        empty={empty}
        testID="feed-scroll"
      />
      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </View>
  )
}

function keyExtractor(post: PostWithLatestComment) {
  return post.id
}
