import { desc, eq, sql } from 'drizzle-orm'
import { Href, type LoaderProps, SafeAreaView, getURL, useLoader } from 'one'
import { ScrollView } from 'react-native'
import { isWeb } from 'tamagui'
import { db } from '~/src/db/connection'
import { follows, likes, posts, reposts, users } from '~/src/db/schema'
import { NotificationCard } from '~/src/notifications/NotificationCard'
import { PageContainer } from '~/src/ui/PageContainer'
import { notifications } from '~/src/data'

type NotificationType = 'like' | 'follow' | 'repost'

export default function NotificationsPage() {
  const feed = notifications.map((item, i) => {
    return <NotificationCard key={i} {...(item as any)} />
  })

  return (
    <ScrollView>
      <PageContainer>{isWeb ? feed : <SafeAreaView>{feed}</SafeAreaView>}</PageContainer>
    </ScrollView>
  )
}
