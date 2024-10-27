import { useRef, type ElementRef } from 'react'
import { desc, eq, sql } from 'drizzle-orm'
import { Href, type LoaderProps, SafeAreaView, getURL, useLoader } from 'one'
import { ScrollView } from 'react-native'
import { useScrollToTop } from '@react-navigation/native'
import { isWeb } from 'tamagui'
import { db } from '~/code/db/connection'
import { follows, likes, posts, reposts, users } from '~/code/db/schema'
import { NotificationCard } from '~/code/notifications/NotificationCard'
import { PageContainer } from '~/code/ui/PageContainer'
import { notifications } from '~/code/data'

type NotificationType = 'like' | 'follow' | 'repost'

export default function NotificationsPage() {
  const scrollViewRef = useRef<ElementRef<typeof ScrollView>>(null)
  useScrollToTop(scrollViewRef)

  const feed = notifications.map((item, i) => {
    return <NotificationCard key={i} {...(item as any)} />
  })

  return (
    <ScrollView ref={scrollViewRef}>
      <PageContainer>{isWeb ? feed : <SafeAreaView>{feed}</SafeAreaView>}</PageContainer>
    </ScrollView>
  )
}
