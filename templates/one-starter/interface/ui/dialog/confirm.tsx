// the confirm queue and its host, one entry, the host's legs by platform: ios
// asks with the system alert, android with the Material alert dialog, web with
// the Tamagui dialog. the split lives one relative hop behind this entry for the
// reason forms/Form.tsx gives: the exports map never names a file with a
// platform sibling.
export {
  dialogConfirm,
  DialogConfirmUnavailableError,
  ensureConfirmed,
  isDialogConfirmOpen,
  type DialogConfirmProps,
} from './confirmQueue'
export { DialogConfirmContent } from './DialogConfirmContent'
export * from './DialogConfirmHost'
