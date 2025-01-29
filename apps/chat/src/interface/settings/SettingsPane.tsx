import { YStack } from 'tamagui'
import { updateSessionState, useSessionState } from '../../state/session'
import { hiddenPanelWidth } from './constants'

export const SettingsPane = ({ name, children }: { name: 'user' | 'settings'; children: any }) => {
  const sessionState = useSessionState()

  return (
    <>
      <YStack
        fullscreen
        z={99_000}
        bg="$shadow3"
        animation="quicker"
        opacity={0}
        pointerEvents="none"
        {...(sessionState.showPanel === name && {
          opacity: 1,
          pe: 'auto',
        })}
        onPress={() => {
          updateSessionState({
            showPanel: null,
          })
        }}
      />
      <YStack
        height="100%"
        data-tauri-drag-region
        animation="quicker"
        position="absolute"
        r={0}
        bg="$color1"
        elevation="$4"
        t={0}
        opacity={0}
        pointerEvents="none"
        x={10}
        width={hiddenPanelWidth}
        z={100_000}
        p="$4"
        gap="$4"
        {...(sessionState.showPanel === name && {
          x: 0,
          opacity: 1,
          pe: 'auto',
        })}
      >
        {children}
      </YStack>
    </>
  )
}
