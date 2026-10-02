import { Link, router } from 'one'
import { memo, useState } from 'react'
import { H3, Separator, Sheet, Spacer, View, XStack, YStack } from 'tamagui'
import { useAuth } from '~/features/auth/client/authClient'
import { useLogout } from '~/features/auth/useLogout'
import { Logo } from '~/interface/app/Logo'
import { Avatar } from '~/interface/avatars/Avatar'
import { Button } from '~/interface/buttons/Button'
import { ScrollHeader } from '~/interface/headers/ScrollHeader'
import { DoorIcon } from '~/interface/icons/phosphor/DoorIcon'
import { GearIcon } from '~/interface/icons/phosphor/GearIcon'
import { ListIcon } from '~/interface/icons/phosphor/ListIcon'
import { PageContainer } from '~/interface/layout/PageContainer'
import { ThemeSwitch } from '~/interface/theme/ThemeSwitch'
import { NavigationTabs } from './NavigationTabs'
export const MainHeader = () => {
  const { user } = useAuth()
  return (
    <ScrollHeader>
      <PageContainer>
        <YStack w="100%" py="2.5">
          <XStack position="relative" w="100%" px="2" items="center">
            <XStack gap="2" items="center">
              <Link href="/" aria-label="Home" asChild>
                <Logo height={20} />
              </Link>
            </XStack>

            <Spacer flex={1} />

            <XStack
              position="absolute"
              inset={0}
              pointerEvents="none"
              items="center"
              justify="center"
            >
              <View pointerEvents="auto">
                <NavigationTabs />
              </View>
            </XStack>

            <XStack
              gap="2.5"
              items="center"
              display={{
                default: 'none',
                md: 'flex',
              }}
            >
              {user && (
                <Button circular cursor="pointer">
                  <Avatar
                    disableBorder
                    size={28}
                    image={user.image}
                    name={user.name ?? 'User'}
                  />
                </Button>
              )}

              <ThemeSwitch />
              <Button
                circular
                onPress={() => router.push('/home/settings')}
                icon={<GearIcon size={18} />}
                aria-label="Settings"
              />
            </XStack>

            <MainHeaderMenu />
          </XStack>
        </YStack>
      </PageContainer>
    </ScrollHeader>
  )
}
export const MainHeaderMenu = memo(() => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const { logout } = useLogout()
  const handleLogout = () => {
    void logout()
    setOpen(false)
  }
  return (
    <>
      <Button
        appearance="transparent"
        circular
        icon={<ListIcon size={24} />}
        aria-label="Menu"
        onPress={() => setOpen(true)}
        display={{
          md: 'none',
        }}
      />
      <Sheet
        open={open}
        onOpenChange={setOpen}
        transition="medium"
        modal
        dismissOnSnapToBottom
        snapPoints={[50]}
      >
        <Sheet.Overlay
          bg="shadow-6"
          transition="quick"
          opacity={{
            enter: 0,
            exit: 0,
          }}
        />
        <Sheet.Container>
          <Sheet.Background bg="color-2" boxShadow="0 0 10px shadow-4" />
          <YStack flex={1} gap="2">
            <XStack p="4" pb="3" justify="space-between" items="center">
              <XStack gap="3" items="center">
                <Logo height={32} />
              </XStack>
              <ThemeSwitch />
            </XStack>

            <Separator />

            <YStack flex={1} p="3" gap="2">
              <XStack
                p="3"
                rounded="4"
                gap="3"
                items="center"
                cursor="pointer"
                onPress={() => {
                  setOpen(false)
                  router.push('/home/settings')
                }}
                bg={{
                  hover: 'color-3',
                  press: 'color-4',
                }}
              >
                <GearIcon />
                <H3 size="3">Settings</H3>
              </XStack>

              <XStack
                p="3"
                rounded="4"
                gap="3"
                items="center"
                cursor="pointer"
                onPress={handleLogout}
                bg={{
                  hover: 'color-3',
                  press: 'color-4',
                }}
              >
                <DoorIcon />
                <H3 size="3">Logout</H3>
              </XStack>
            </YStack>

            {user && (
              <XStack p="4" pt="2" gap="3" items="center">
                <Avatar size={40} image={user.image} name={user.name ?? 'User'} />
                <YStack flex={1}>
                  <H3 size="3" fontWeight="600">
                    {user.name || user.email}
                  </H3>
                </YStack>
              </XStack>
            )}
          </YStack>
        </Sheet.Container>
      </Sheet>
    </>
  )
})
