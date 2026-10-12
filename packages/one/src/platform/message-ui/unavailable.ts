import type {
  MFMailComposeViewControllerDelegate,
  MFMessageComposeViewControllerDelegate,
  MFMailComposeController,
  MFMessageComposeController,
} from './types'
const unavailable = (): never => {
  throw new Error('MessageUI needs an iOS build')
}
export class MFMailComposeViewController implements MFMailComposeController {
  static canSendMail(): boolean {
    return false
  }
  mailComposeDelegate: MFMailComposeViewControllerDelegate<MFMailComposeViewController> | null =
    null
  setSubject(_subject: string): void {
    unavailable()
  }
  setToRecipients(_recipients: string[]): void {
    unavailable()
  }
  setCcRecipients(_recipients: string[]): void {
    unavailable()
  }
  setBccRecipients(_recipients: string[]): void {
    unavailable()
  }
  setMessageBody(_body: string, _isHTML: boolean): void {
    unavailable()
  }
  setPreferredSendingEmailAddress(_emailAddress: string): void {
    unavailable()
  }
  addAttachmentData(
    _attachment: ArrayBuffer,
    _mimeType: string,
    _fileName: string
  ): void {
    unavailable()
  }
  async present(_animated = true): Promise<void> {
    unavailable()
  }
  async dismiss(_animated = true): Promise<void> {
    unavailable()
  }
}
export class MFMessageComposeViewController implements MFMessageComposeController {
  static canSendText(): boolean {
    return false
  }
  static canSendAttachments(): boolean {
    return false
  }
  static canSendSubject(): boolean {
    return false
  }
  static isSupportedAttachmentUTI(_uti: string): boolean {
    return false
  }
  messageComposeDelegate: MFMessageComposeViewControllerDelegate<MFMessageComposeViewController> | null =
    null
  recipients: string[] | undefined
  body: string | undefined
  subject: string | undefined
  get attachments(): import('./types').MessageAttachment[] {
    return []
  }
  disableUserAttachments(): void {
    unavailable()
  }
  addAttachmentData(
    _attachment: ArrayBuffer,
    _typeIdentifier: string,
    _filename: string
  ): boolean {
    return unavailable()
  }
  addAttachmentURL(_attachmentURL: string, _withAlternateFilename?: string): boolean {
    return unavailable()
  }
  async present(_animated = true): Promise<void> {
    unavailable()
  }
  async dismiss(_animated = true): Promise<void> {
    unavailable()
  }
}
