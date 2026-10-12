import type { HybridObject } from 'react-native-nitro-modules'
import type { DocumentCameraError } from './OneDocumentCamera.nitro'

export type MailComposeResult = 'cancelled' | 'saved' | 'sent' | 'failed'
export type MessageComposeResult = 'cancelled' | 'sent' | 'failed'

export interface OneMailCompose extends HybridObject<{ ios: 'swift' }> {
  canSendMail(): boolean
  setSubject(subject: string): void
  setToRecipients(recipients: string[]): void
  setCcRecipients(recipients: string[]): void
  setBccRecipients(recipients: string[]): void
  setMessageBody(body: string, isHTML: boolean): void
  setPreferredSendingEmailAddress(emailAddress: string): void
  addAttachmentData(attachment: ArrayBuffer, mimeType: string, fileName: string): void
  present(
    animated: boolean,
    didFinish: (result: MailComposeResult, error: DocumentCameraError | undefined) => void
  ): Promise<void>
  dismiss(animated: boolean): Promise<void>
}

export interface MessageAttachment {
  attachmentURL: string
  attachmentAlternateFilename?: string
}
export interface OneMessageCompose extends HybridObject<{ ios: 'swift' }> {
  canSendText(): boolean
  canSendAttachments(): boolean
  canSendSubject(): boolean
  isSupportedAttachmentUTI(uti: string): boolean
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
  addAttachmentURL(
    attachmentURL: string,
    withAlternateFilename: string | undefined
  ): boolean
  present(
    animated: boolean,
    didFinish: (result: MessageComposeResult) => void
  ): Promise<void>
  dismiss(animated: boolean): Promise<void>
}
