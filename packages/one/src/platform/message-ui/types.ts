import type { DocumentCameraError } from '../specs/OneDocumentCamera.nitro'
import type {
  MailComposeResult,
  MessageComposeResult,
  MessageAttachment,
} from '../specs/OneMessageUI.nitro'
export type {
  MailComposeResult as MFMailComposeResult,
  MessageComposeResult,
  MessageAttachment,
}
export type MessageUIError = DocumentCameraError
export interface MFMailComposeViewControllerDelegate<Controller = unknown> {
  mailComposeController(
    controller: Controller,
    result: { didFinishWith: MailComposeResult; error?: MessageUIError }
  ): void
}
export interface MFMessageComposeViewControllerDelegate<Controller = unknown> {
  messageComposeViewController(
    controller: Controller,
    result: { didFinishWith: MessageComposeResult }
  ): void
}

export interface MFMailComposeController {
  mailComposeDelegate: MFMailComposeViewControllerDelegate<MFMailComposeController> | null
  setSubject(subject: string): void
  setToRecipients(recipients: string[]): void
  setCcRecipients(recipients: string[]): void
  setBccRecipients(recipients: string[]): void
  setMessageBody(body: string, isHTML: boolean): void
  setPreferredSendingEmailAddress(emailAddress: string): void
  addAttachmentData(attachment: ArrayBuffer, mimeType: string, fileName: string): void
  present(animated?: boolean): Promise<void>
  dismiss(animated?: boolean): Promise<void>
}
export interface MFMessageComposeController {
  messageComposeDelegate: MFMessageComposeViewControllerDelegate<MFMessageComposeController> | null
  recipients: string[] | undefined
  body: string | undefined
  subject: string | undefined
  readonly attachments: MessageAttachment[]
  disableUserAttachments(): void
  addAttachmentData(
    attachment: ArrayBuffer,
    typeIdentifier: string,
    filename: string
  ): boolean
  addAttachmentURL(attachmentURL: string, withAlternateFilename?: string): boolean
  present(animated?: boolean): Promise<void>
  dismiss(animated?: boolean): Promise<void>
}
