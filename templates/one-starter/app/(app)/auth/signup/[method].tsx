import { useParams, useRouter, createRoute } from 'one'
import { memo, useLayoutEffect, useRef, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SizableText, Spinner, useEvent, XStack, YStack } from 'tamagui'
import { Button } from '~/interface/buttons/Button'
import { Pressable } from '~/interface/buttons/Pressable'
import { showError } from '~/interface/dialogs/actions'
import { Input } from '~/interface/forms/Input'
import { CaretLeftIcon } from '~/interface/icons/phosphor/CaretLeftIcon'
import { PageLayout } from '~/interface/pages/PageLayout'
const route = createRoute<'/(app)/auth/signup/[method]'>()
export const SignupPage = memo(() => {
  const { method } = useParams<{
    method?: 'email'
  }>()
  const { top } = useSafeAreaInsets()
  const router = useRouter()
  const inputRef = useRef<any>(null)
  const [inputValue, setInputValue] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const isDisabled = !inputValue.trim()
  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus?.()
    }, 650)
    return () => clearTimeout(timer)
  }, [])
  const handleGoBack = useEvent(() => router.back())
  const handleContinue = useEvent(async () => {
    if (!method) {
      showError('Authentication method is not specified.')
      return
    }
    setLoading(true)
    try {
      router.push(
        `/auth/login/password?method=${method}&value=${encodeURIComponent(inputValue)}`
      )
    } finally {
      setLoading(false)
    }
  })
  if (method !== 'email') {
    return (
      <YStack flex={1} bg="background" pt={top} px="4">
        <XStack items="center" gap="3">
          <Pressable onPress={handleGoBack}>
            <CaretLeftIcon size={24} />
          </Pressable>
        </XStack>
        <YStack flex={1} items="center" justify="center">
          <SizableText fontSize={16} opacity={0.6}>
            Invalid authentication method
          </SizableText>
        </YStack>
      </YStack>
    )
  }
  return (
    <PageLayout>
      <YStack flex={1} bg="background" pt={top} px="4" gap="4">
        <XStack items="center" gap="3">
          <Pressable onPress={handleGoBack}>
            <CaretLeftIcon size={24} />
          </Pressable>
          <SizableText size="6" fontWeight="bold">
            Continue with Email
          </SizableText>
        </XStack>

        <SizableText size="4" color="color-10">
          Sign in or sign up with your email.
        </SizableText>

        <YStack gap="4" mt="4">
          <Input
            data-testid="email-input"
            ref={inputRef}
            placeholder="Enter email address"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            autoCapitalize="none"
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleContinue()
            }}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
          />

          <Button
            data-testid="next-button"
            size="lg"
            onPress={handleContinue}
            disabled={isDisabled || loading}
            scale={{
              press: 0.97,
            }}
            opacity={{
              press: 0.9,
            }}
          >
            {loading ? <Spinner size="small" /> : 'Next'}
          </Button>
        </YStack>
      </YStack>
    </PageLayout>
  )
})
