import { Link } from 'one'
import { memo } from 'react'
import { SizableText, Spacer, XStack, YStack } from 'tamagui'
import { useAuth } from '~/auth/client/authClient'
import { APP_NAME } from '~/constants'
import { APP_HOME_HREF } from '~/features/app/routes'
import { Button } from '~/interface/buttons/Button'
import { SiteHeaderMenu } from './SiteHeaderMenu'

// shared site header used on splash + docs. hidden on /home/* (authenticated
// app shell handles its own chrome). responsive: full nav on $md+, hamburger
// (Sheet) below.
export const SiteHeader = memo(() => {
  const auth = useAuth()
  const isAuthed = auth.isLoggedIn

  return (
    <YStack render="header" t={0} z={50} width="100%">
      <XStack maxW={1100} mx="auto" width="100%" items="center" py={13} px={18}>
        <Link href="/" aria-label="Home">
          <SizableText fontWeight="800" size="6">
            {APP_NAME}
          </SizableText>
        </Link>

        <Spacer flex={1} />

        <XStack gap={7} items="center" display="none md:flex">
          <Link href="/docs/intro" asChild>
            <Button render="a" size="sm" variant="outlined">
              Docs
            </Button>
          </Link>
          <Link href={isAuthed ? APP_HOME_HREF : '/auth/login'} asChild>
            <Button render="a" size="sm" accent>
              {isAuthed ? 'Open app' : 'Sign in'}
            </Button>
          </Link>
        </XStack>

        <SiteHeaderMenu />
      </XStack>
    </YStack>
  )
})
