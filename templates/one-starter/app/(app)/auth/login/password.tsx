import { router, useParams } from 'one'
import { useState } from 'react'
import { Keyboard } from 'react-native'
import { YStack } from 'tamagui'
import { authClient } from '~/features/auth/client/authClient'
import { passwordLogin } from '~/features/auth/client/passwordLogin'
import { Button } from '~/interface/buttons/Button'
import { showError } from '~/interface/dialogs/actions'
import { Input } from 'tamagui'
import { PasswordIcon } from '~/interface/icons/phosphor/PasswordIcon'
import { KeyboardStickyFooter } from '~/interface/keyboard/KeyboardStickyFooter'
import { StepPageLayout } from '~/interface/pages/StepPageLayout'
export const PasswordPage = () => {
  const params = useParams<{
    value?: string
  }>()
  const [loading, setLoading] = useState<boolean>(false)
  const displayValue = params.value || 'example@gmail.com'
  const [password, setPassword] = useState('')
  const handleContinue = async (createAccount = false) => {
    if (!params.value) {
      showError('Email is not specified.')
      return
    }
    setLoading(true)
    try {
      const { error } = createAccount
        ? await authClient.signUp.email({
            email: params.value,
            password,
            name: params.value.split('@')[0]!,
          })
        : await passwordLogin(params.value, password)
      if (error) {
        Keyboard.dismiss()
        showError(error)
        return
      }
      router.replace('/home')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  return (
    <StepPageLayout
      title="Enter Password"
      Icon={PasswordIcon}
      description="Please enter the password for"
      descriptionSecondLine={displayValue}
      bottom={
        <KeyboardStickyFooter openedOffset={-10}>
          <Button
            data-testid="submit-password-button"
            size="lg"
            onPress={() => handleContinue()}
            disabled={!password || loading}
          >
            {loading ? 'Verifying...' : 'Next'}
          </Button>
          <Button
            appearance="outlined"
            size="lg"
            mt="3"
            onPress={() => handleContinue(true)}
            disabled={password.length < 8 || loading}
          >
            Create Account
          </Button>
        </KeyboardStickyFooter>
      }
    >
      <YStack>
        <Input
          data-testid="password-input"
          type="password"
          autoFocus
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => handleContinue()}
        />
      </YStack>
    </StepPageLayout>
  )
}
