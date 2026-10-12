import type { MFMailComposeViewControllerDelegate, MFMessageComposeViewControllerDelegate, MFMailComposeController, MFMessageComposeController } from './types';
export declare class MFMailComposeViewController implements MFMailComposeController {
    static canSendMail(): boolean;
    mailComposeDelegate: MFMailComposeViewControllerDelegate<MFMailComposeViewController> | null;
    setSubject(_subject: string): void;
    setToRecipients(_recipients: string[]): void;
    setCcRecipients(_recipients: string[]): void;
    setBccRecipients(_recipients: string[]): void;
    setMessageBody(_body: string, _isHTML: boolean): void;
    setPreferredSendingEmailAddress(_emailAddress: string): void;
    addAttachmentData(_attachment: ArrayBuffer, _mimeType: string, _fileName: string): void;
    present(_animated?: boolean): Promise<void>;
    dismiss(_animated?: boolean): Promise<void>;
}
export declare class MFMessageComposeViewController implements MFMessageComposeController {
    static canSendText(): boolean;
    static canSendAttachments(): boolean;
    static canSendSubject(): boolean;
    static isSupportedAttachmentUTI(_uti: string): boolean;
    messageComposeDelegate: MFMessageComposeViewControllerDelegate<MFMessageComposeViewController> | null;
    recipients: string[] | undefined;
    body: string | undefined;
    subject: string | undefined;
    get attachments(): import('./types').MessageAttachment[];
    disableUserAttachments(): void;
    addAttachmentData(_attachment: ArrayBuffer, _typeIdentifier: string, _filename: string): boolean;
    addAttachmentURL(_attachmentURL: string, _withAlternateFilename?: string): boolean;
    present(_animated?: boolean): Promise<void>;
    dismiss(_animated?: boolean): Promise<void>;
}
//# sourceMappingURL=unavailable.d.ts.map