import { H3, YStack } from 'tamagui'
import { authClient } from '~/better-auth/authClient'
import { ListItem } from '~/interface/lists/ListItem'
import { hiddenPanelWidth } from '~/interface/settings/constants'
import { ThemeToggleListItem } from './ThemeToggleListItem'
import { updateUserState } from '~/state/user'

export const AccountSettingsPane = () => {
  return (
    <YStack
      height="100%"
      data-tauri-drag-region
      position="absolute"
      t={0}
      r={-hiddenPanelWidth}
      width={hiddenPanelWidth}
      p="$4"
      gap="$4"
    >
      <H3>Account Settings</H3>

      <ThemeToggleListItem />

      <ListItem
        onPress={() => {
          authClient.signOut()
          updateUserState({
            showSidePanel: undefined,
          })
        }}
      >
        Logout
      </ListItem>
    </YStack>
  )
}
