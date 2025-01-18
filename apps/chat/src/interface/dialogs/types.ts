import type { TabsContentProps } from 'tamagui'

export type DialogConfirmType = {
  type: 'confirm'
  title: string
  description: string
}

export type DialogCreateServerType = {
  type: 'create-server'
}

export type DialogJoinServerType = {
  type: 'join-server'
}

export type DialogAddFriend = {
  type: 'add-friend'
}

export type DialogSignup = {
  type: 'signup'
}

export type DialogRedirectToTauri = {
  type: 'redirect-to-tauri'
}

export type DialogType =
  | { type: 'closed' }
  | DialogConfirmType
  | DialogCreateServerType
  | DialogJoinServerType
  | DialogAddFriend
  | DialogSignup
  | DialogRedirectToTauri

export type TabContentPaneProps = TabsContentProps & {
  active: string
  value: string
  setShow: React.Dispatch<React.SetStateAction<boolean>>
}
