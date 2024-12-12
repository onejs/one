export type DialogConfirmType = {
  type: 'confirm'
  title: string
  description: string
}

export type DialogCreateServerType = {
  type: 'create-server'
}

export type DialogAddFriend = {
  type: 'add-friend'
}

export type DialogType = DialogConfirmType | DialogCreateServerType | DialogAddFriend
