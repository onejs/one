import { useEffect } from 'react'
import { useLoader, useNavigation, useParams } from 'vxs'
import { feedData } from '~/features/feed/data'
import { FeedCard } from '~/features/feed/FeedCard'
import { PageContainer } from '~/features/ui/PageContainer'

export function loader({ params }) {
  return feedData.find((x) => x.id === +params.id)
}

export default function FeedItemPage() {
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
        <FeedCard {...data} />
      </PageContainer>
    </>
  )
}
