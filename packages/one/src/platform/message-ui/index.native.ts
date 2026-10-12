import { NitroModules } from 'react-native-nitro-modules'
import type { OneMailCompose, OneMessageCompose } from '../specs/OneMessageUI.nitro'
import { rethrowNativeError } from '../nativeError'
import type {
  MFMailComposeViewControllerDelegate,
  MFMessageComposeViewControllerDelegate,
  MFMailComposeController,
  MFMessageComposeController,
} from './types'
export type * from './types'

function create<T extends OneMailCompose | OneMessageCompose>(name: string): T {
  if (!NitroModules.hasHybridObject(name)) throw new Error('MessageUI needs an iOS build')
  return NitroModules.createHybridObject<T>(name)
}
let mailCapabilities: OneMailCompose | undefined
let messageCapabilities: OneMessageCompose | undefined

export class MFMailComposeViewController implements MFMailComposeController {
  static canSendMail(): boolean {
    return (mailCapabilities ??= create<OneMailCompose>('OneMailCompose')).canSendMail()
  }
  mailComposeDelegate: MFMailComposeViewControllerDelegate<MFMailComposeViewController> | null =
    null
  private readonly native = create<OneMailCompose>('OneMailCompose')
  setSubject(subject: string): void {
    this.native.setSubject(subject)
  }
  setToRecipients(recipients: string[]): void {
    this.native.setToRecipients(recipients)
  }
  setCcRecipients(recipients: string[]): void {
    this.native.setCcRecipients(recipients)
  }
  setBccRecipients(recipients: string[]): void {
    this.native.setBccRecipients(recipients)
  }
  setMessageBody(body: string, isHTML: boolean): void {
    this.native.setMessageBody(body, isHTML)
  }
  setPreferredSendingEmailAddress(emailAddress: string): void {
    this.native.setPreferredSendingEmailAddress(emailAddress)
  }
  addAttachmentData(attachment: ArrayBuffer, mimeType: string, fileName: string): void {
    this.native.addAttachmentData(attachment, mimeType, fileName)
  }
  present(animated = true): Promise<void> {
    return this.native
      .present(animated, (result, error) =>
        this.mailComposeDelegate?.mailComposeController(this, {
          didFinishWith: result,
          error,
        })
      )
      .catch(rethrowNativeError)
  }
  dismiss(animated = true): Promise<void> {
    return this.native.dismiss(animated).catch(rethrowNativeError)
  }
}
export class MFMessageComposeViewController implements MFMessageComposeController {
  private static capabilities(): OneMessageCompose {
    return (messageCapabilities ??= create<OneMessageCompose>('OneMessageCompose'))
  }
  static canSendText(): boolean {
    return this.capabilities().canSendText()
  }
  static canSendAttachments(): boolean {
    return this.capabilities().canSendAttachments()
  }
  static canSendSubject(): boolean {
    return this.capabilities().canSendSubject()
  }
  static isSupportedAttachmentUTI(uti: string): boolean {
    return this.capabilities().isSupportedAttachmentUTI(uti)
  }
  messageComposeDelegate: MFMessageComposeViewControllerDelegate<MFMessageComposeViewController> | null =
    null
  private readonly native = create<OneMessageCompose>('OneMessageCompose')
  get recipients() {
    return this.native.recipients
  }
  set recipients(value: string[] | undefined) {
    this.native.recipients = value
  }
  get body() {
    return this.native.body
  }
  set body(value: string | undefined) {
    this.native.body = value
  }
  get subject() {
    return this.native.subject
  }
  set subject(value: string | undefined) {
    this.native.subject = value
  }
  get attachments() {
    return this.native.attachments
  }
  disableUserAttachments(): void {
    this.native.disableUserAttachments()
  }
  addAttachmentData(
    attachment: ArrayBuffer,
    typeIdentifier: string,
    filename: string
  ): boolean {
    return this.native.addAttachmentData(attachment, typeIdentifier, filename)
  }
  addAttachmentURL(attachmentURL: string, withAlternateFilename?: string): boolean {
    return this.native.addAttachmentURL(attachmentURL, withAlternateFilename)
  }
  present(animated = true): Promise<void> {
    return this.native
      .present(animated, (result) =>
        this.messageComposeDelegate?.messageComposeViewController(this, {
          didFinishWith: result,
        })
      )
      .catch(rethrowNativeError)
  }
  dismiss(animated = true): Promise<void> {
    return this.native.dismiss(animated).catch(rethrowNativeError)
  }
}
