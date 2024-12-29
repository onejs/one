import { DialogAddFriend } from './DialogAddFriend'
import { DialogConfirm } from './DialogConfirm'
import { DialogCreateJoinServer } from './DialogCreateJoinServer'
import { DialogRedirectToTauri } from './DialogRedirectToTauri'
import { DialogSignUp } from './DialogSignup'

export const Dialogs = () => {
  return (
    <>
      <DialogConfirm />
      <DialogCreateJoinServer />
      <DialogAddFriend />
      <DialogSignUp />
      <DialogRedirectToTauri />
    </>
  )
}
