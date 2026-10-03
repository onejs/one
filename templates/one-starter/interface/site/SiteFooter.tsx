import { Link } from 'one'
import { memo } from 'react'
import { SizableText, XStack, YStack } from 'tamagui'
import { useAuth } from '~/auth/client/authClient'
import { APP_NAME } from '~/constants'
import { APP_HOME_HREF } from '~/features/app/routes'

export const SiteFooter = memo(() => {
  const auth = useAuth()
  const isAuthed = auth.isLoggedIn
  return (
    <YStack render="footer" py="8" mt="auto">
      <YStack maxW={840} mx="auto" width="100%" gap={13} px={18}>
        <XStack gap={18} flexWrap="wrap" justify="center" items="center">
          <Link href="/docs/intro">
            <SizableText size="2" color="color-10">
              Docs
            </SizableText>
          </Link>
          <SizableText size="2" color="color-8">
            •
          </SizableText>
          <Link href={isAuthed ? APP_HOME_HREF : '/auth/login'}>
            <SizableText size="2" color="color-10">
              {isAuthed ? 'Open app' : 'Sign in'}
            </SizableText>
          </Link>
        </XStack>
        <SizableText size="1" color="color-9" text="center">
          © {new Date().getFullYear()} {APP_NAME}
        </SizableText>
      </YStack>
    </YStack>
  )
})
