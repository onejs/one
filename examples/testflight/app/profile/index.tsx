import { useRef, type ComponentRef } from 'react'
import { useScrollToTop } from '@react-navigation/native'
import { ScrollView, YStack, Text, XStack } from 'tamagui'
import { FeedCard } from '~/code/feed/FeedCard'
import { Image } from '~/code/ui/Image'
import { PageContainer } from '~/code/ui/PageContainer'
import { Repeat2 } from '~/components/icons'
import { profileFeed, userData } from '~/code/data'

export default function ProfilePage() {
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null)
  useScrollToTop(scrollViewRef)

  return (
    <PageContainer>
      <ScrollView ref={scrollViewRef}>
        <YStack position="relative" width="100%" height={180} overflow="hidden">
          <Image
            position="absolute"
            top={0}
            right={0}
            bottom={0}
            left={0}
            src="https://placecats.com/millie/300/200"
          />
          <Image
            position="absolute"
            bottom="4"
            left="4"
            width={100}
            height={100}
            borderRadius={100}
            src={userData.avatar || ''}
            borderWidth={1}
            borderColor="color1"
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
                padding="4"
                borderColor="borderColor"
                borderWidth={1}
                borderRadius="4"
                marginBottom="4"
                marginTop="4"
              >
                <XStack gap="2" marginBottom="2">
                  <Repeat2 size={12} color="accent1" />
                  <Text fontFamily="body" color="accent1" fontSize={10}>
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
