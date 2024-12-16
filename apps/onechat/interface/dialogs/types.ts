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

export type DialogType =
  | DialogConfirmType
  | DialogCreateServerType
  | DialogJoinServerType
  | DialogAddFriend

export type TabContentPaneProps = TabsContentProps & {
  active: string
  value: string
  setShow: React.Dispatch<React.SetStateAction<boolean>>
}
