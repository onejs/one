import { Link } from 'one'
import { H1, Paragraph, useMedia, XStack, YStack } from 'tamagui'
import { useAuth } from '~/auth/client/authClient'
import { APP_NAME, APP_TAGLINE } from '~/constants'
import { APP_HOME_HREF } from '~/features/app/routes'
import { Button } from '~/interface/buttons/Button'
import { PageContainer } from '../layout/PageContainer'

// minimal hero — one screen of marketing, no below-fold sections. signed-in
// visitors see Open app instead of Try the demo so the splash works as a
// landing page even after login.
export function Hero() {
  const auth = useAuth()
  const media = useMedia()
  const isAuthed = auth.isLoggedIn
  return (
    <YStack render="section" width="100%" minH="75vh" px={18} py={60}>
      <PageContainer>
        <YStack p={46} bg="background" rounded="6" items="center" gap="8">
          <YStack gap={18} maxW={720} items="center">
            {/* size (not bare fontSize) so lineHeight scales with the font — a
                bare fontSize override keeps the default lineHeight and a headline
                that wraps to two lines renders them overlapping */}
            <H1
              size={media.md ? '13' : '10'}
              fontWeight="800"
              letterSpacing={-1}
              text="center"
              color="color"
            >
              {APP_NAME}
            </H1>
            <Paragraph
              size={media.md ? '7' : '6'}
              color="color-10"
              text="center"
              maxW={600}
            >
              {APP_TAGLINE}
            </Paragraph>
          </YStack>

          <XStack gap={13} flexWrap="wrap" justify="center">
            <Link href={isAuthed ? APP_HOME_HREF : '/auth/login'} asChild>
              <Button render="a" size="lg" accent testID="public-app-entry">
                {isAuthed ? 'Open app' : 'Try the demo'}
              </Button>
            </Link>
          </XStack>
        </YStack>
      </PageContainer>
    </YStack>
  )
}
