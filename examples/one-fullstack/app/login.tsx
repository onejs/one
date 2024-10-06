import type { Provider } from '@supabase/supabase-js'
import { LogoIcon } from '@tamagui/logo'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Button, Input, Paragraph, Separator, Spinner, XStack, YStack } from 'tamagui'
import { HeadInfo } from '~/components/HeadInfo'
import { useSupabase } from '~/features/supabase/useSupabaseClient'
import { useUser } from '~/features/user/useUser'

const isProd = process.env.NODE_ENV === 'production'
const emailAuthDisabledFlag = isProd

export default function SignInPage() {
  return (
    <>
      <HeadInfo title="Login" />
      <SignIn />
    </>
  )
}

function SignIn() {
  const { supabase } = useSupabase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type?: string; content?: string }>({
    type: '',
    content: '',
  })
  const { data } = useUser()
  const user = data?.user

  if (!supabase) {
    return (
      <YStack ai="center" flex={1} jc="center">
        <Spinner size="small" />
      </YStack>
    )
  }

  const handleSignin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setLoading(true)
    setMessage({})

    try {
      if (showPasswordInput) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        })
        if (error) throw error
        setMessage({
          type: 'note',
          content: 'Check your email for the magic link.',
        })
      }
    } catch (error) {
      setMessage({ type: 'error', content: `${error}` })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: Provider) => {
    const redirectTo = `${window.location.origin}/api/auth/callback`
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: 'read:org',
      },
    })
    if (error) {
      setMessage({ type: 'error', content: error.message })
    }
    setLoading(false)
  }

  if (!user)
    return (
      <YStack mih="100%" miw="100%" ai="center" jc="center" p="$2">
        <YStack miw={300} maw={320} jc="space-between" p="$2" gap="$4">
          <YStack mb="$4">
            <LogoIcon />
          </YStack>

          {Boolean(message.content) && (
            <>
              <Paragraph>{message.content}</Paragraph>
            </>
          )}

          <Button
            // @ts-ignore
            type="submit"
            disabled={loading}
            onClick={() => handleOAuthSignIn('github')}
            size="$4"
          >
            Continue with GitHub
          </Button>

          <Paragraph ta="center" color="$color8">
            Note: If part of a sponsoring organization, you'll need to grant access to your org when
            logging in to access sponsor benefits.
          </Paragraph>

          {!emailAuthDisabledFlag && (
            <>
              <XStack mx="$4" jc="center" space ai="center">
                <Separator />
                <Paragraph size="$2">Or</Paragraph>
                <Separator />
              </XStack>
              <YStack>
                {!showPasswordInput && (
                  <form onSubmit={handleSignin}>
                    <YStack space="$3">
                      <Input
                        autoComplete="email"
                        inputMode="email"
                        placeholder="Email"
                        // @ts-ignore
                        onSubmitEditing={handleSignin}
                        value={email}
                        onChange={(e) => setEmail(e.nativeEvent.text)}
                        disabled={emailAuthDisabledFlag}
                      />
                      <Button
                        // @ts-expect-error
                        type="submit"
                        icon={loading ? <Spinner size="small" /> : null}
                        disabled={!email.length || emailAuthDisabledFlag}
                      >
                        Send magic link
                      </Button>
                    </YStack>
                  </form>
                )}

                {showPasswordInput && (
                  <form onSubmit={handleSignin}>
                    <YStack space="$2">
                      <Input
                        autoComplete="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.nativeEvent.text)}
                        // @ts-ignore
                        required
                        disabled={emailAuthDisabledFlag}
                      />
                      <Input
                        autoComplete="password"
                        secureTextEntry
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.nativeEvent.text)}
                        // @ts-ignore
                        required
                        disabled={emailAuthDisabledFlag}
                      />
                      <Button
                        // @ts-ignore
                        type="submit"
                        loading={loading}
                        disabled={!password.length || !email.length || emailAuthDisabledFlag}
                      >
                        Sign in
                      </Button>
                    </YStack>
                  </form>
                )}

                {emailAuthDisabledFlag && (
                  <YStack
                    pos="absolute"
                    left={-5}
                    right={-5}
                    top={-5}
                    bottom={-5}
                    ai="center"
                    jc="center"
                    br="$4"
                    className="backdrop-blur"
                  >
                    <Paragraph ta="center" mt="$2" col="$color9">
                      Email auth is disabled at the moment.
                    </Paragraph>
                  </YStack>
                )}
              </YStack>
            </>
          )}
        </YStack>
      </YStack>
    )

  return (
    <YStack
      zIndex={10000000}
      backgroundColor="$background"
      justifyContent="center"
      pos="absolute"
      fullscreen
      alignItems="center"
    >
      <Spinner size="small" />
    </YStack>
  )
}
