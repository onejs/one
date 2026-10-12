import type { MFMailComposeViewControllerDelegate, MFMessageComposeViewControllerDelegate, MFMailComposeController, MFMessageComposeController } from './types';
export type * from './types';
export declare class MFMailComposeViewController implements MFMailComposeController {
    static canSendMail(): boolean;
    mailComposeDelegate: MFMailComposeViewControllerDelegate<MFMailComposeViewController> | null;
    private readonly native;
    setSubject(subject: string): void;
    setToRecipients(recipients: string[]): void;
    setCcRecipients(recipients: string[]): void;
    setBccRecipients(recipients: string[]): void;
    setMessageBody(body: string, isHTML: boolean): void;
    setPreferredSendingEmailAddress(emailAddress: string): void;
    addAttachmentData(attachment: ArrayBuffer, mimeType: string, fileName: string): void;
    present(animated?: boolean): Promise<void>;
    dismiss(animated?: boolean): Promise<void>;
}
export declare class MFMessageComposeViewController implements MFMessageComposeController {
    private static capabilities;
    static canSendText(): boolean;
    static canSendAttachments(): boolean;
    static canSendSubject(): boolean;
    static isSupportedAttachmentUTI(uti: string): boolean;
    messageComposeDelegate: MFMessageComposeViewControllerDelegate<MFMessageComposeViewController> | null;
    private readonly native;
    get recipients(): string[] | undefined;
    set recipients(value: string[] | undefined);
    get body(): string | undefined;
    set body(value: string | undefined);
    get subject(): string | undefined;
    set subject(value: string | undefined);
    get attachments(): import("./types").MessageAttachment[];
    disableUserAttachments(): void;
    addAttachmentData(attachment: ArrayBuffer, typeIdentifier: string, filename: string): boolean;
    addAttachmentURL(attachmentURL: string, withAlternateFilename?: string): boolean;
    present(animated?: boolean): Promise<void>;
    dismiss(animated?: boolean): Promise<void>;
}
//# sourceMappingURL=index.native.d.ts.map