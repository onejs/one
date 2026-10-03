import { useSafeAreaInsets } from 'one'
import { Circle, isWeb, SizableText, Square, View, XStack, YStack } from 'tamagui'
import { APP_NAME } from '~/constants'
import { LoginDemoButton } from '~/features/auth/ui/LoginDemoButton'
import { LoginEmailButton } from '~/features/auth/ui/LoginEmailButton'
import { LoginLegalText } from '~/features/auth/ui/LoginLegalText'
import { H2 } from '~/interface/text/Headings'

// the login surface, shared so the `/auth/login` route and the native
// first-boot splash both render it without one route importing another.

const LOGO_INITIAL = APP_NAME.slice(0, 1).toUpperCase()

function LogoMark({ size = 72 }: { size?: number }) {
  return (
    <Circle
      size={size}
      bg="background"
      boxShadow="0 8px 18px shadow-3"
      borderWidth={0.5}
      borderColor="color-4"
      items="center"
      justify="center"
    >
      <Square size={size * 0.54} rounded="5" bg="accent-background" rotate="-8deg">
        <SizableText color="accent-color" fontWeight="900" size="8">
          {LOGO_INITIAL}
        </SizableText>
      </Square>
    </Circle>
  )
}

function LoginButtons() {
  return (
    <YStack width="100%" gap={18}>
      <LoginDemoButton />
      <LoginEmailButton />
      <LoginLegalText />
    </YStack>
  )
}

function WebLoginPage() {
  return (
    <XStack flex={1} flexBasis="auto" position="relative" minH="100vh">
      <YStack flex={1} justify="center" items="center" p="8">
        <Circle size={72} transition="medium" scale="enter:0.95" opacity="enter:0" mb={7}>
          <LogoMark size={72} />
        </Circle>

        <YStack
          gap={18}
          width="100%"
          maxW={420}
          items="center"
          bg="background"
          rounded="8"
          p="18px md:8"
          borderWidth={1}
          borderColor="color-3"
          boxShadow="0 18px 20px shadow-3"
        >
          <H2 text="center">Login to {APP_NAME}</H2>

          <YStack
            key="welcome-content"
            gap={18}
            items="center"
            width="100%"
            transition="medium"
            opacity="enter:0 exit:0"
            y="enter:10px exit:-10px"
            position="relative"
            overflow="hidden"
          >
            <LoginButtons />
          </YStack>
        </YStack>
      </YStack>
    </XStack>
  )
}

function NativeLoginPage() {
  const insets = useSafeAreaInsets()

  return (
    <YStack flex={1} bg="color-2">
      {/* the side safe-area edges keep the content clear of chrome beside the page */}
      <View
        flex={1}
        items="center"
        justify="center"
        pt={insets.top}
        px="8"
        ml={insets.left}
        mr={insets.right}
      >
        <View mb="6" transition="medium" opacity="enter:0" scale="enter:0.9" y="enter:-20px">
          <LogoMark size={74} />
        </View>

        <YStack items="center" gap={7} transition="medium" opacity="enter:0" y="enter:10px">
          <SizableText size="9" fontFamily="heading" text="center" color="color" fontWeight="700">
            {APP_NAME}
          </SizableText>
          <SizableText size="4" color="color-11" text="center" maxW={280}>
            Sign in to continue to your account
          </SizableText>
        </YStack>
      </View>

      <View transition="medium" opacity="enter:0" y="enter:30px">
        <YStack
          px="6"
          pt="8"
          gap={18}
          pb={insets.bottom + 16}
          rounded="10"
          borderBottomLeftRadius={0}
          borderBottomRightRadius={0}
          bg="background/80"
          borderWidth={0.5}
          borderColor="color-4"
          boxShadow="0 -12px 24px shadow-2"
        >
          <YStack pl={insets.left} pr={insets.right}>
            <LoginButtons />
          </YStack>
        </YStack>
      </View>
    </YStack>
  )
}

export function LoginScreen() {
  return isWeb ? <WebLoginPage /> : <NativeLoginPage />
}
