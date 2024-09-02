import { useEffect } from 'react'
import { Button, TextArea, XStack, YStack } from 'tamagui'
import { useLoader, useNavigation, useParams } from 'vxs'
import { feedData } from '~/features/feed/data'
import { FeedCard } from '~/features/feed/FeedCard'
import { Image } from '~/features/ui/Image'
import { PageContainer } from '~/features/ui/PageContainer'

export function loader({ params }) {
  return feedData.find((x) => x.id === +params.id)
}

export default () => <PostPage />

export function PostPage() {
  const data = useLoader(loader)

  const navigation = useNavigation()
  const params = useParams()

  useEffect(() => {
    navigation.setOptions({ title: data?.content || `Post #${params.id}` })
  }, [navigation])

  if (!data) {
    return null
  }

  return (
    <>
      <PageContainer>
        <FeedCard {...data} disableLink />

        <XStack p="$4" gap="$4" bbw={1} bbc="$borderColor">
          <Image
            width={32}
            height={32}
            br={100}
            mt="$2"
            src="https://placecats.com/millie/300/200"
          />
          <YStack f={1} gap="$2">
            <TextArea
              unstyled
              ff="$body"
              fos="$5"
              color="$color"
              py="$2"
              rows={4}
              autoFocus
              placeholder="Your reply..."
            />
            <Button als="flex-end" br="$10" themeInverse>
              Post
            </Button>
          </YStack>
        </XStack>
      </PageContainer>
    </>
  )
}
