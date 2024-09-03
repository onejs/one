import { isWeb } from 'tamagui'
import { SafeAreaView, useLoader } from 'vxs'
import { NotificationCard } from '~/features/notifications/NotificationCard'
import { PageContainer } from '~/features/ui/PageContainer'
import { fetchNotifications } from '~/data/notifications'

export async function loader() {
  const data = await fetchNotifications({
    queryKey: ['notifications', 1, 40],
  })
  return {
    notifications: data.notifications, // Extract notifications array
  }
}

export default function NotificationsPage() {
  const { notifications } = useLoader(loader)
  const feed = notifications.map((item, i) => {
    return <NotificationCard key={i} {...item} />
  })

  return (
    <>
      <PageContainer>{isWeb ? feed : <SafeAreaView>{feed}</SafeAreaView>}</PageContainer>
    </>
  )
}
