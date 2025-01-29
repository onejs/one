import { useState } from 'react'
import { Button, Dialog, H3, isWeb, XStack, YStack } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { isTauri } from '~/tauri/constants'
import { ButtonSimple } from '../ButtonSimple'
import { GithubIcon } from '../icons/GithubIcon'
import { isSignedUpEmitter } from './actions'
import { DialogContent, DialogOverlay, useDialogEmit } from './shared'

export const DialogSignUp = () => {
  const { loggedIn } = useAuth()
  const [show, setShow] = useState(false)

  useDialogEmit((next) => {
    if (next.type === 'signup') {
      setShow((x) => !x)
    }
  })

  if (loggedIn && show) {
    setShow(false)
  }

  return (
    <Dialog modal open={!!show}>
      <Dialog.Portal>
        <DialogOverlay
          onPress={() => {
            setShow(false)
          }}
        />

        <DialogContent>
          <YStack flex={1}>
            <H3>Signup</H3>

            <YStack flex={1} items="center" justify="center">
              <TauriOpenNewWindowLoginLink>
                <Button size="$5" scaleIcon={1.5} icon={GithubIcon}>
                  Login with Github
                </Button>
              </TauriOpenNewWindowLoginLink>
            </YStack>
          </YStack>

          <XStack justify="flex-end" gap="$2">
            <Dialog.Close asChild>
              <ButtonSimple
                onPress={() => {
                  isSignedUpEmitter.emit(false)
                  setShow(false)
                }}
              >
                Cancel
              </ButtonSimple>
            </Dialog.Close>
          </XStack>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}

const TauriOpenNewWindowLoginLink = (props: { children: any }) => {
  if (!isWeb) {
    // TODO
    return props.children
  }

  return (
    <a
      target="_blank"
      href={window.location.origin + '/login-github'}
      style={{
        textDecoration: 'none',
      }}
      rel="noreferrer"
      onClick={(e) => {
        if (!isTauri) {
          e.preventDefault()
          authClient.signIn.social({
            provider: 'github',
          })
          return
        }
      }}
      {...props}
    />
  )
}
