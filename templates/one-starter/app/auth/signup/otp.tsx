import { useParams, useRouter } from 'one'
import { useEffect, useState } from 'react'
import { SizableText, useEvent, YStack } from 'tamagui'
import { APP_HOME_HREF } from '~/features/app/routes'
import { otpLogin, validateLoginOtpCode } from '~/features/auth/client/otpLogin'
import { OtpInput } from '~/features/auth/ui/OtpInput'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'
import { StepPageLayout } from '~/interface/pages/StepPageLayout'

export default function OtpPage() {
  const router = useRouter()
  const params = useParams<{ method?: 'email'; value?: string }>()
  const [otpCode, setOtpCode] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpKey, setOtpKey] = useState(0)
  const [timerCount, setTimerCount] = useState(30)
  const [error, setError] = useState<string | null>(null)

  const isDisabled = otpCode.length !== 6 || loading
  const displayValue = params.value || 'email@example.com'

  useEffect(() => {
    if (timerCount <= 0) return
    const timer = setTimeout(() => setTimerCount((count) => count - 1), 1000)
    return () => clearTimeout(timer)
  }, [timerCount])

  const handleResendOtp = useEvent(async () => {
    if (params.method !== 'email' || !params.value) {
      setError('Authentication method or value is not specified.')
      return
    }
    setLoading(true)
    setOtpCode('')
    setOtpKey(Date.now())
    setError(null)
    try {
      const { error } = await validateLoginOtpCode(params.method, params.value)
      setIsError(!!error)
      if (error) setError(error.message)
      setTimerCount(30)
    } finally {
      setLoading(false)
    }
  })

  const handleCodeChanged = useEvent((code: string) => {
    setOtpCode(code)
    if (isError && code.length < 6) setIsError(false)
  })

  const handleContinue = useEvent(async () => {
    if (params.method !== 'email' || !params.value) {
      setError('Authentication method or value is not specified.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { error } = await otpLogin(params.method, params.value, otpCode)
      if (error) {
        setIsError(true)
        setError(error.message)
        setOtpCode('')
        setOtpKey(Date.now())
        return
      }
      router.replace(APP_HOME_HREF)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (otpCode.length === 6) {
      handleContinue()
    }
  }, [handleContinue, otpCode])

  return (
    <StepPageLayout
      title="Enter Code"
      Icon={Icons.Passcode}
      description="We sent a verification code to your email"
      descriptionSecondLine={displayValue}
      bottom={
        <Button
          accent
          data-testid="verify-otp-button"
          testID="verify-otp-button"
          size="lg"
          disabled={isDisabled}
          onPress={handleContinue}
          opacity={isDisabled ? 0.5 : 1}
        >
          {loading ? 'Verifying...' : 'Next'}
        </Button>
      }
    >
      <YStack items="center" gap={13}>
        <OtpInput
          data-testid="otp-input"
          key={otpKey}
          autoFocus
          otpCount={6}
          onCodeChanged={handleCodeChanged}
          defaultValue={otpCode}
          isError={isError}
        />

        {error ? (
          <SizableText color="red-900" text="center">
            {error}
          </SizableText>
        ) : null}

        {timerCount > 0 ? (
          <SizableText size="4" color="color-11">
            Resend Code in ({timerCount})
          </SizableText>
        ) : (
          <Button
            data-testid="resend-otp-button"
            testID="resend-otp-button"
            onPress={handleResendOtp}
          >
            Resend
          </Button>
        )}
      </YStack>
    </StepPageLayout>
  )
}
