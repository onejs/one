import { useState, useEffect, type ReactNode } from 'react'
import { AlertDialog, Button, XStack, YStack } from 'tamagui'
type DialogState = {
  type: 'error' | 'confirm' | null
  title: string
  description: string
  resolve?: (value: boolean) => void
}
let globalShowDialog:
  | ((
      state: Omit<DialogState, 'resolve'> & {
        resolve?: (value: boolean) => void
      }
    ) => void)
  | null = null
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    type: null,
    title: '',
    description: '',
  })
  const showDialog = (
    newState: Omit<DialogState, 'resolve'> & {
      resolve?: (value: boolean) => void
    }
  ) => {
    setState({
      ...newState,
      resolve: newState.resolve,
    } as DialogState)
  }
  useEffect(() => {
    globalShowDialog = showDialog
    return () => {
      globalShowDialog = null
    }
  }, [])
  const handleClose = (confirmed: boolean) => {
    if (!state.resolve) return
    const resolve = state.resolve
    setState({
      type: null,
      title: '',
      description: '',
    })
    resolve(confirmed)
  }
  return (
    <>
      {children}
      <AlertDialog
        open={state.type !== null}
        onOpenChange={(open) => {
          // only handle dismissal (backdrop tap / swipe), not button presses
          if (!open && state.type !== null) {
            handleClose(false)
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            key="overlay"
            opacity={{
              default: 0.5,
              enter: 0,
              exit: 0,
            }}
          />
          <AlertDialog.Content
            bordered
            elevate
            key="content"
            x={{
              default: 0,
              enter: 0,
              exit: 0,
            }}
            scale={{
              default: 1,
              enter: 0.9,
              exit: 0.95,
            }}
            opacity={{
              default: 1,
              enter: 0,
              exit: 0,
            }}
            y={{
              default: 0,
              enter: -20,
              exit: 10,
            }}
            w="90%"
            maxW={400}
          >
            <YStack gap="4">
              <AlertDialog.Title size="6">{state.title}</AlertDialog.Title>
              <AlertDialog.Description size="3" color="color-11">
                {state.description}
              </AlertDialog.Description>

              <XStack gap="3" justify="flex-end">
                {state.type === 'confirm' ? (
                  <>
                    <Button onPress={() => handleClose(false)}>Cancel</Button>
                    <Button theme="accent" onPress={() => handleClose(true)}>
                      Confirm
                    </Button>
                  </>
                ) : (
                  <Button theme="accent" onPress={() => handleClose(false)}>
                    OK
                  </Button>
                )}
              </XStack>
            </YStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </>
  )
}
export const showError = (error: unknown, title = 'Error') => {
  let description = 'An unexpected error occurred'
  if (error instanceof Error) {
    description = error.message
  } else if (typeof error === 'string') {
    description = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    description = String(error.message)
  }
  if (globalShowDialog) {
    globalShowDialog({
      type: 'error',
      title,
      description,
    })
  } else {
    console.error(`${title}: ${description}`)
  }
}
export const dialogConfirm = async (props: {
  title?: string
  description?: string
}): Promise<boolean> => {
  const { title = 'Confirm', description = 'Are you sure?' } = props
  if (!globalShowDialog) {
    console.warn('DialogProvider not mounted, returning false')
    return false
  }
  return new Promise<boolean>((resolve) => {
    globalShowDialog!({
      type: 'confirm',
      title,
      description,
      resolve,
    })
  })
}
