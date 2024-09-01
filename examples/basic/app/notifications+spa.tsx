import { Stack, useLoader } from 'vxs'
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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <PageContainer>
        {notifications.map((item, i) => {
          return <NotificationCard key={i} {...item} />
        })}
      </PageContainer>
    </>
  )
}
