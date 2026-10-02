import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr'
import { useState } from 'react'
import { Button, Input, Text, View } from 'tamagui'

export const EmailSignup = () => {
  const isHydrated = useDidFinishSSR()
  const [formState, setFormState] = useState<{
    loading: boolean
    message: string
    type: null | 'success' | 'error'
  }>({ loading: false, message: '', type: null })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormState({ loading: true, message: '', type: null })

    const formData = new FormData(event.target)

    try {
      const response = await fetch('/api/mailing-list-signup', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.status === 'success') {
        setFormState({
          loading: false,
          message: 'Thank you for signing up!',
          type: 'success',
        })
      } else {
        setFormState({
          loading: false,
          message: `Error: ${result.message}`,
          type: 'error',
        })
      }
    } catch (error) {
      setFormState({
        loading: false,
        message: 'An unexpected error occurred. Please try again later.',
        type: 'error',
      })
    }
  }

  return (
    <View
      theme="yellow"
      br="6"
      borderColor="color5"
      mt="5"
      gap="3"
      w="100%"
      px="gtSm:8"
      maw={600}
      als="center"
    >
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script>

      <form onSubmit={handleSubmit} action="/api/mailing-list-signup" method="POST">
        <View flexDirection="row" gap="3">
          <Input
            type={'email' as any}
            f={1}
            size="md"
            height={44}
            px="3-5"
            py={0}
            br="4"
            fontSize="4"
            lineHeight="4"
            fontWeight="400"
            borderColor="borderColor hover:borderColorHover focus:borderColorFocus"
            placeholderTextColor="color11"
            placeholder="Your email, for development updates..."
          />
          <Button
            size="md"
            height={44}
            borderColor="transparent hover:borderColorHover"
            icon={
              <Text color="color11">
                {formState.loading ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="6"
                    viewBox="0 0 24 6"
                    fill="none"
                  >
                    <circle cx="3" cy="3" r="3" fill="currentColor">
                      <animate
                        attributeName="opacity"
                        values="1;0;1"
                        dur="1s"
                        repeatCount="indefinite"
                        begin="0.1s"
                      />
                    </circle>
                    <circle cx="12" cy="3" r="3" fill="currentColor">
                      <animate
                        attributeName="opacity"
                        values="1;0;1"
                        dur="1s"
                        repeatCount="indefinite"
                        begin="0.3s"
                      />
                    </circle>
                    <circle cx="21" cy="3" r="3" fill="currentColor">
                      <animate
                        attributeName="opacity"
                        values="1;0;1"
                        dur="1s"
                        repeatCount="indefinite"
                        begin="0.5s"
                      />
                    </circle>
                  </svg>
                ) : (
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      width="20"
                      height="16"
                      x="2"
                      y="4"
                      rx="2"
                      stroke="currentColor"
                    />
                    <path
                      d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
                      stroke="currentColor"
                    />
                  </svg>
                )}
              </Text>
            }
          />
        </View>

        {isHydrated && (
          <div
            className="cf-turnstile"
            data-size="compact"
            data-sitekey="0x4AAAAAAAhB3YybI4UeXEYX"
          />
        )}

        {formState.message && (
          <View
            theme={formState.type === 'success' ? 'green' : 'red'}
            mt="3"
            p="2"
            bg="color2"
            br="4"
          >
            <Text>{formState.message}</Text>
          </View>
        )}
      </form>
    </View>
  )
}
