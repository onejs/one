import { useRef, type ElementRef } from 'react'
import { useScrollToTop } from '@react-navigation/native'
import { ScrollView, YStack, Text, SizableStack, XStack } from 'tamagui'
import { getURL, type LoaderProps, useLoader } from 'one'
import { FeedCard } from '~/code/feed/FeedCard'
import { Image } from '~/code/ui/Image'
import { PageContainer } from '~/code/ui/PageContainer'
import { Repeat2 } from '@tamagui/lucide-icons'
import { db } from '~/code/db/connection'
import { posts, reposts, users, likes, replies } from '~/code/db/schema'
import { eq, sql, desc } from 'drizzle-orm'
import { profileFeed, userData } from '~/code/data'


export default function ProfilePage() {
  const scrollViewRef = useRef<ElementRef<typeof ScrollView>>(null)
  useScrollToTop(scrollViewRef)

  return (
    <PageContainer>
      <ScrollView ref={scrollViewRef}>
        <YStack pos="relative" w="100%" h={180} ov="hidden">
          <Image
            pos="absolute"
            t={0}
            r={0}
            b={0}
            l={0}
            src="https://placecats.com/millie/300/200"
          />
          <Image
            pos="absolute"
            b="$4"
            l="$4"
            w={100}
            h={100}
            br={100}
            src={userData.avatar || ''}
            bw={1}
            bc="$color1"
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
                padding="$4"
                borderColor="$borderColor"
                borderWidth={1}
                borderRadius="$4"
                marginBottom="$4"
                mt="$4"
              >
                <XStack gap="$2" marginBottom="$2">
                  <Repeat2 size={12} color="$accent1" />
                  <Text ff="$body" color="$accent1" fontSize={10}>
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
