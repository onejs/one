import { DialogAddFriend } from './DialogAddFriend'
import { DialogConfirm } from './DialogConfirm'
import { DialogCreateJoinServer } from './DialogCreateJoinServer'
import { DialogSignUp } from './DialogSignup'

export const Dialogs = () => {
  return (
    <>
      <DialogConfirm />
      <DialogCreateJoinServer />
      <DialogAddFriend />
      <DialogSignUp />
    </>
  )
}
