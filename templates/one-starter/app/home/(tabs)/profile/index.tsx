import { useRouter } from 'one'
import { isWeb, Paragraph, View, XStack, YStack } from 'tamagui'
import { signOut, useSession } from '~/auth/client/authClient'
import { postsByUserId } from '~/data/post/queries'
import { userById } from '~/data/userPublic/queries'
import { useQuery } from '~/data/zero-client'
import { AccountToolbarButton } from '~/features/account/AccountToolbarButton'
import { APP_SETTINGS_HREF } from '~/features/app/routes'
import { Link } from '~/interface/app/Link'
import { Avatar } from '~/interface/avatars/Avatar'
import { Button } from '~/interface/buttons/Button'
import { PostCard } from '~/interface/feed/PostCard'
import { PageScrollView } from '~/interface/layout/PageScrollView'

export default function ProfilePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id ?? ''
  const [user] = useQuery(userById, { userId }, { enabled: !!userId })
  const [posts] = useQuery(postsByUserId, { userId }, { enabled: !!userId })
  const displayName = user?.name || session?.user?.name || 'You'
  const username = user?.username || session?.user?.email?.split('@')[0] || 'user'
  const avatarImage = user?.image || session?.user?.image

  const onLogout = async () => {
    await signOut()
    router.replace('/auth/login')
  }

  return (
    <PageScrollView contentPaddingTop={12} startUnderBar>
      {/* the permanent settings entry, mounted in the root's content so it
          configures this tab's own navigation bar. null on web. */}
      <AccountToolbarButton />
      <YStack gap={13} mx="auto" width="100%" maxW={640} px="13px web:16px">
        {/* native: the gear in this tab's bar is the settings entry and
            settings holds sign-out, so the header is identity only. web has
            no bar, so it keeps both actions inline. */}
        <XStack
          gap={13}
          items="center"
          flexDirection={isWeb ? 'row' : 'column'}
          pt={isWeb ? 0 : 8}
          data-testid="profile-screen"
          testID="profile-screen"
        >
          <Avatar
            image={avatarImage}
            name={displayName || username || session?.user?.email || '?'}
            size={isWeb ? 56 : 88}
            testID="profile-avatar"
          />
          <YStack flex={isWeb ? 1 : undefined} items={isWeb ? 'flex-start' : 'center'}>
            <Paragraph size={isWeb ? '6' : '8'} fontWeight="700">
              {displayName}
            </Paragraph>
            <Paragraph color="color-10" data-testid="profile-username" testID="profile-username">
              @{username}
            </Paragraph>
            <Paragraph color="color-10">{session?.user?.email}</Paragraph>
          </YStack>
          {isWeb ? (
            <>
              <Link asChild href={APP_SETTINGS_HREF}>
                <Button render="a" size="sm" testID="profile-settings">
                  Settings
                </Button>
              </Link>
              <Button size="sm" theme="red" onPress={onLogout} testID="logout">
                Logout
              </Button>
            </>
          ) : null}
        </XStack>

        {posts.length === 0 ? (
          <View p="6" items="center">
            <Paragraph color="color-10">Nothing here yet.</Paragraph>
          </View>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </YStack>
    </PageScrollView>
  )
}
