import { isWeb } from 'tamagui'
import { SafeAreaView, useLoader } from 'vxs'
import { notificationData } from '~/features/notifications/data'
import { NotificationCard } from '~/features/notifications/NotificationCard'
import { PageContainer } from '~/features/ui/PageContainer'

export function loader() {
  return {
    notifications: notificationData,
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
