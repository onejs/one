import { Sheet } from '~/interface/ui/sheet/Sheet'
import { usePathname } from 'one'
import { memo, useState } from 'react'
import { Button, Separator, SizableText, View, XStack, YStack } from 'tamagui'
import { useAuth } from '~/auth/client/authClient'
import { APP_NAME } from '~/constants'
import { APP_HOME_HREF } from '~/features/app/routes'
import { Link } from '~/interface/app/Link'
import { Icons } from '~/interface/icons'

export const SiteHeaderMenu = memo(() => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isDocsPage = pathname.startsWith('/docs')
  const auth = useAuth()
  const isAuthed = auth.isLoggedIn

  return (
    <>
      {/* responsive hide lives on a plain View: media styles on pseudo-styled
          buttons resolve at runtime (no SSR media class), so $md on the Button
          itself hydration-mismatches and leaves it visible on desktop */}
      <View display="md:none">
        <Button
          size="sm"
          circular
          variant="quiet"
          aria-label="Menu"
          icon={Icons.Menu}
          onPress={() => setOpen(true)}
        />
      </View>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        sheetVariant={isDocsPage ? 'large' : 'compact'}
      >
        <Sheet.Overlay bg="background" opacity="0.5 enter:0 exit:0" transition="quick" />

        <Sheet.Container rounded="6">
          <Sheet.Background bg="color-2" boxShadow="0 0 30px shadow-4" />
          <YStack flex={1} gap={7}>
            <XStack
              paddingTop={18}
              paddingRight={18}
              paddingLeft={18}
              pb={13}
              justify="space-between"
              items="center"
            >
              <SizableText fontWeight="800" size="6">
                {APP_NAME}
              </SizableText>
            </XStack>

            <YStack px={18} pt={18} gap={13}>
              <Link href="/docs/intro" onPress={() => setOpen(false)}>
                <SizableText size="5">Docs</SizableText>
              </Link>
              <Link href={isAuthed ? APP_HOME_HREF : '/auth/login'} onPress={() => setOpen(false)}>
                <SizableText size="5">{isAuthed ? 'Open app' : 'Sign in'}</SizableText>
              </Link>
            </YStack>
          </YStack>
        </Sheet.Container>
      </Sheet>
    </>
  )
})
