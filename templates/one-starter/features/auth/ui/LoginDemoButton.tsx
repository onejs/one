import { useState } from 'react'
import { SizableText, Spinner } from 'tamagui'
import { signInAsDemo } from '~/auth/client/authClient'
import { Button } from '~/interface/buttons/Button'

export function LoginDemoButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoginAsDemo = async () => {
    setLoading(true)
    setError(null)
    const result = await signInAsDemo()
    if (result.error) {
      setLoading(false)
      setError(result.error.message ?? 'Demo login failed')
    }
  }

  return (
    <>
      <Button
        accent
        size="lg"
        onPress={handleLoginAsDemo}
        disabled={loading}
        width="100%"
        data-testid="login-as-demo"
        testID="login-as-demo"
      >
        {loading ? <Spinner size="small" color="accent-color" /> : 'Login as Demo User'}
      </Button>
      {error ? (
        <SizableText color="red-900" text="center">
          {error}
        </SizableText>
      ) : null}
    </>
  )
}
