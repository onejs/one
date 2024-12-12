import { DialogAddFriend } from './DialogAddFriend'
import { DialogConfirm } from './DialogConfirm'
import { DialogCreateServer } from './DialogCreateServer'

export const Dialogs = () => {
  return (
    <>
      <DialogConfirm />
      <DialogCreateServer />
      <DialogAddFriend />
    </>
  )
}
