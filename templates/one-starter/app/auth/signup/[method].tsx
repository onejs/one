import { Input } from '~/interface/ui/forms/Input'
import { useParams, useRouter, type Href } from 'one'
import { useLayoutEffect, useRef, useState } from 'react'
import { isWeb, SizableText, useEvent, YStack } from 'tamagui'
import { validateLoginOtpCode } from '~/features/auth/client/otpLogin'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'
import { StepPageLayout } from '~/interface/pages/StepPageLayout'

export default function SignupPage() {
  const { method } = useParams<{ method?: 'email' }>()
  const router = useRouter()
  const inputRef = useRef<any>(null)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isDisabled = !inputValue.trim() || loading

  useLayoutEffect(() => {
    if (isWeb) {
      inputRef.current?.focus()
      return
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 650)
    return () => clearTimeout(timer)
  }, [])

  const handleContinue = useEvent(async () => {
    if (method !== 'email') {
      setError('Authentication method is not specified.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { success, error } = await validateLoginOtpCode(method, inputValue)
      if (success) {
        // one brands dynamic href strings; this route is backed by app/auth/signup/otp.tsx.
        const href =
          `/auth/signup/otp?method=${method}&value=${encodeURIComponent(inputValue)}` as Href
        router.push(href)
        return
      }
      setError(error.message)
    } finally {
      setLoading(false)
    }
  })

  if (method !== 'email') {
    return (
      <StepPageLayout title="Sign Up">
        <YStack flex={1} items="center" justify="center">
          <SizableText size="4" color="color-10">
            Invalid authentication method
          </SizableText>
        </YStack>
      </StepPageLayout>
    )
  }

  return (
    <StepPageLayout
      title="Continue with Email"
      Icon={Icons.Mail}
      description="Sign in or sign up with your email."
      bottom={
        <Button
          accent
          data-testid="next-button"
          testID="next-button"
          size="lg"
          onPress={handleContinue}
          disabled={isDisabled}
          opacity={isDisabled ? 0.5 : 1}
        >
          {loading ? 'Processing...' : 'Next'}
        </Button>
      }
    >
      <YStack gap={13}>
        <Input
          aria-label="Email address"
          ref={inputRef}
          data-testid="email-input"
          testID="email-input"
          placeholder="Enter email address"
          value={inputValue}
          onChangeText={setInputValue}
          autoCapitalize="none"
          onSubmitEditing={handleContinue}
          keyboardType="email-address"
          autoComplete="email"
          inputMode="email"
          size={false}
          rounded="6"
          bg="background/80"
          borderColor="color-4"
        />
        {error ? (
          <SizableText color="red-900" text="center">
            {error}
          </SizableText>
        ) : null}
      </YStack>
    </StepPageLayout>
  )
}
