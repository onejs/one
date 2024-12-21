import { createEmitter } from '@vxrn/emitter'
import { useState } from 'react'
import { Button, Dialog, H3, XStack, YStack } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { getCurrentUser } from '~/state/user'
import { isTauri } from '~/tauri/constants'
import { ButtonSimple } from '../ButtonSimple'
import { GithubIcon } from '../icons/GithubIcon'
import { DialogContent, dialogEmit, DialogOverlay, useDialogEmit } from './shared'

const isSignedUpEmitter = createEmitter<boolean>()

export const dialogSignup = async () => {
  dialogEmit({
    type: 'signup',
  })

  return new Promise((res) => {
    const dispose = isSignedUpEmitter.listen((val) => {
      dispose()
      res(val)
    })
  })
}

export const ensureSignedUp = async () => {
  if (getCurrentUser()) {
    return getCurrentUser()
  }
  await dialogSignup()
  return getCurrentUser()
}

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
          <YStack f={1}>
            <H3>Signup</H3>

            <YStack f={1} ai="center" jc="center">
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
              >
                <Button size="$6" icon={GithubIcon}>
                  Github
                </Button>
              </a>
            </YStack>
          </YStack>

          <XStack jc="flex-end" gap="$2">
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
