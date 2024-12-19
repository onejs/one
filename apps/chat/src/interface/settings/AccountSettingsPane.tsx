import { H3, YStack } from 'tamagui'
import { authClient } from '~/better-auth/authClient'
import { ListItem } from '~/interface/ListItem'
import { hiddenPanelWidth } from '~/interface/settings/constants'
import { ThemeToggleListItem } from './ThemeToggleListItem'

export const AccountSettingsPane = () => {
  return (
    <YStack
      h="100%"
      data-tauri-drag-region
      pos="absolute"
      t={0}
      r={-hiddenPanelWidth}
      w={hiddenPanelWidth}
      p="$4"
      gap="$4"
    >
      <H3>Account Settings</H3>

      <ThemeToggleListItem />

      <ListItem
        onPress={() => {
          authClient.signOut()
        }}
      >
        Logout
      </ListItem>
    </YStack>
  )
}
