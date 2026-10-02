import { router } from 'one'
import { useState } from 'react'
import { Circle, isWeb, Spinner, YStack } from 'tamagui'
import { APP_NAME } from '~/constants/app'
import { signInAsDemo } from '~/features/auth/client/signInAsDemo'
import { isDemoMode } from '~/helpers/isDemoMode'
import { Link } from '~/interface/app/Link'
import { LogoIcon } from '~/interface/app/LogoIcon'
import { Button } from '~/interface/buttons/Button'
import { H2 } from '~/interface/text/Headings'
import { showToast } from '~/interface/toast/Toast'
export const LoginPage = () => {
  const [demoLoading, setDemoLoading] = useState<boolean>(false)
  return (
    <YStack
      flex={1}
      justify="center"
      items="center"
      minHeight={{
        web: '100vh',
      }}
    >
      <Circle
        size={80}
        my="4"
        transition="medium"
        scale={{
          enter: 0.95,
        }}
        opacity={{
          enter: 0,
        }}
      >
        <LogoIcon size={42} />
      </Circle>

      <YStack
        gap="6"
        w="100%"
        items="center"
        bg="background"
        rounded="8"
        p={isWeb ? '6' : '4'}
        maxW={isWeb ? 400 : '90%'}
      >
        <H2 text="center">Login to {APP_NAME}</H2>

        <YStack
          key="welcome-content"
          gap="4"
          items="center"
          w="100%"
          transition="medium"
          position="relative"
          overflow="hidden"
          opacity={{
            enter: 0,
            exit: 0,
          }}
          y={{
            enter: 10,
            exit: -10,
          }}
        >
          <YStack w="100%" gap="3">
            <Link href="/auth/signup/email" asChild>
              <Button
                size="lg"
                theme="accent"
                appearance="floating"
                transition="200ms"
                scale={{
                  press: 0.97,
                  enter: 0.95,
                }}
                opacity={{
                  press: 0.9,
                  enter: 0,
                }}
              >
                Continue with Email
              </Button>
            </Link>

            {/* DEMO mode - enabled in dev or when VITE_DEMO_MODE=1 */}
            {isDemoMode && (
              <Button
                appearance="outlined"
                size="lg"
                onPress={async () => {
                  setDemoLoading(true)
                  const { error } = await signInAsDemo()
                  setDemoLoading(false)
                  if (error) {
                    showToast('Demo login failed', {
                      type: 'error',
                    })
                    return
                  }
                  router.replace('/home/feed')
                }}
                disabled={demoLoading}
                w="100%"
                data-testid="login-as-demo"
                transition="200ms"
                scale={{
                  press: 0.97,
                  enter: 0.95,
                }}
                opacity={{
                  enter: 0,
                }}
              >
                {demoLoading ? <Spinner size="small" /> : 'Login as Demo User'}
              </Button>
            )}
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  )
}
