import { useEffect } from 'react'
import { useLoader, useNavigation, useParams } from 'vxs'
import { FeedCard } from '~/features/feed/FeedCard'
import { PageContainer } from '~/features/ui/PageContainer'
import { fetchPost } from '~/data/post'
import { YStack } from 'tamagui'

export async function loader({ params }) {
  const data = await fetchPost({
    queryKey: ['post', params.id],
  })
  return data
}

export default function FeedItemPage() {
  const data = useLoader(loader)

  const navigation = useNavigation()
  const params = useParams()

  useEffect(() => {
    navigation.setOptions({ title: data?.content || `Post #${params.id}` })
  }, [navigation, data?.content, params.id])

  if (!data) {
    return null
  }

  return (
    <>
      <PageContainer>
        <FeedCard {...data} disableLink />
        {data.replies && data.replies.length > 0 && (
          <YStack
            marginLeft="$7"
            borderLeftWidth={1}
            borderRightWidth={1}
            borderColor="$borderColor"
          >
            {data.replies.map((reply) => (
              <FeedCard key={reply.id} {...reply} disableLink isReply />
            ))}
          </YStack>
        )}
      </PageContainer>
    </>
  )
}
