import { createEmitter } from '@vxrn/emitter'
import { getCurrentUser } from '~/state/user'
import { dialogEmit } from './shared'
import type { DialogConfirmType } from './types'

export const isSignedUpEmitter = createEmitter<boolean>()

export const dialogSignup = async () => {
  dialogEmit({
    type: 'signup',
  })
  return isSignedUpEmitter.nextValue()
}

export const ensureSignedUp = async () => {
  let user = getCurrentUser()
  if (user) {
    return user
  }
  await dialogSignup()
  user = getCurrentUser()
  if (!user) {
    throw new Error(`Didn't finish sign up`)
  }
  return user
}

export const confirmEmitter = createEmitter<boolean>()

export const dialogConfirm = async (props: Omit<DialogConfirmType, 'type'>) => {
  dialogEmit({
    type: 'confirm',
    ...props,
  })
  return confirmEmitter.nextValue()
}

export const serverDialogEmitter = createEmitter<boolean>()

export const dialogCreateServer = async () => {
  dialogEmit({
    type: 'create-server',
  })
  return serverDialogEmitter.nextValue()
}

export const dialogJoinServer = async () => {
  dialogEmit({
    type: 'join-server',
  })
  return serverDialogEmitter.nextValue()
}

export const addFriendEmitter = createEmitter<boolean>()

export const dialogAddFriend = async () => {
  dialogEmit({
    type: 'add-friend',
  })
  return addFriendEmitter.nextValue()
}
