import { Stack, useLoader } from 'vxs'
import { feedData } from '~/features/feed/data'
import { FeedCard } from '~/features/feed/FeedCard'
import { PageContainer } from '~/features/ui/PageContainer'

export function loader({ params }) {
  return feedData.find((x) => x.id === +params.id)
}

export default function FeedItemPage() {
  const data = useLoader(loader)

  if (!data) {
    return null
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <PageContainer>
        <FeedCard {...data} />
      </PageContainer>
    </>
  )
}
