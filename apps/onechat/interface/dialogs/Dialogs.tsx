import { DialogAddFriend } from './DialogAddFriend'
import { DialogConfirm } from './DialogConfirm'
import { DialogCreateJoinServer } from './DialogCreateJoinServer'

export const Dialogs = () => {
  return (
    <>
      <DialogConfirm />
      <DialogCreateJoinServer />
      <DialogAddFriend />
    </>
  )
}
