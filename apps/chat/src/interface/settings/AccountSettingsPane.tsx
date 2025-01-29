import { H3 } from 'tamagui'
import { authClient } from '~/better-auth/authClient'
import { ListItem } from '~/interface/lists/ListItem'
import { updateSessionState } from '../../state/session'
import { SettingsPane } from './SettingsPane'
import { ThemeToggleListItem } from './ThemeToggleListItem'

export const AccountSettingsPane = () => {
  return (
    <SettingsPane name="user">
      <H3>Account Settings</H3>

      <ThemeToggleListItem />

      <ListItem
        onPress={() => {
          authClient.signOut()
          updateSessionState({
            showPanel: null,
          })
        }}
      >
        Logout
      </ListItem>
    </SettingsPane>
  )
}
