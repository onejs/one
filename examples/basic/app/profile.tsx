import { ScrollView, YStack, Text, SizableStack, XStack } from 'tamagui'
import { useLoader } from 'vxs'
import { FeedCard } from '~/features/feed/FeedCard'
import { Image } from '~/features/ui/Image'
import { PageContainer } from '~/features/ui/PageContainer'
import { fetchProfile } from '~/data/profile'
import { Recycle, Repeat2 } from '@tamagui/lucide-icons'

export async function loader() {
  const data = await fetchProfile({
    queryKey: ['profile', 1, 10],
  })
  return {
    profileFeed: data.profileFeed,
    userData: data.userData,
  }
}

export default function ProfilePage() {
  const { profileFeed, userData } = useLoader(loader)

  return (
    <PageContainer>
      <ScrollView>
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
            src={userData.avatar}
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
