import { describe, expect, it, vi } from 'vitest'
import {
  MFMailComposeViewController as WebMail,
  MFMessageComposeViewController as WebMessage,
} from '../src/platform/message-ui/index'
vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { hasHybridObject: vi.fn(), createHybridObject: vi.fn() },
}))
async function load(mail: unknown, message: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.hasHybridObject).mockReturnValue(true)
  vi.mocked(NitroModules.createHybridObject).mockImplementation(
    (name) => (name === 'OneMailCompose' ? mail : message) as never
  )
  return import('../src/platform/message-ui/index.native')
}
describe('MessageUI', () => {
  it('reports web unavailability and rejects presentation', async () => {
    expect(WebMail.canSendMail()).toBe(false)
    expect(WebMessage.canSendText()).toBe(false)
    await expect(new WebMail().present()).rejects.toThrow('iOS build')
    await expect(new WebMessage().present()).rejects.toThrow('iOS build')
  })
  it('forwards mail configuration and bytes intact, preserving results and errors', async () => {
    let finish: (result: string, error?: unknown) => void = () => {}
    const mail = {
      canSendMail: () => true,
      setSubject: vi.fn(),
      setToRecipients: vi.fn(),
      setCcRecipients: vi.fn(),
      setBccRecipients: vi.fn(),
      setMessageBody: vi.fn(),
      setPreferredSendingEmailAddress: vi.fn(),
      addAttachmentData: vi.fn(),
      present: vi.fn(async (_animated, cb) => {
        finish = cb
      }),
      dismiss: vi.fn(async () => {}),
    }
    const { MFMailComposeViewController: Mail } = await load(mail, {})
    expect(Mail.canSendMail()).toBe(true)
    const controller = new Mail()
    controller.setSubject('subject')
    controller.setToRecipients(['to'])
    controller.setCcRecipients(['cc'])
    controller.setBccRecipients(['bcc'])
    controller.setMessageBody('<b>body</b>', true)
    controller.setPreferredSendingEmailAddress('from')
    const data = new Uint8Array([1, 2, 3]).buffer
    controller.addAttachmentData(data, 'text/plain', 'file.txt')
    expect(mail.addAttachmentData).toHaveBeenCalledWith(data, 'text/plain', 'file.txt')
    expect(mail.setMessageBody).toHaveBeenCalledWith('<b>body</b>', true)
    expect(mail.setToRecipients).toHaveBeenCalledWith(['to'])
    const delegate = vi.fn()
    controller.mailComposeDelegate = { mailComposeController: delegate }
    await controller.present(false)
    for (const result of ['cancelled', 'saved', 'sent', 'failed']) finish(result)
    expect(delegate).toHaveBeenLastCalledWith(controller, {
      didFinishWith: 'failed',
      error: undefined,
    })
    const error = { domain: 'mail', code: 7, localizedDescription: 'failed' }
    finish('failed', error)
    expect(delegate).toHaveBeenLastCalledWith(controller, {
      didFinishWith: 'failed',
      error,
    })
    expect(mail.dismiss).not.toHaveBeenCalled()
    await controller.dismiss(false)
    expect(mail.dismiss).toHaveBeenCalledWith(false)
  })
  it('preserves message fields, attachment result and completion identity', async () => {
    let finish: (result: string) => void = () => {}
    const message = {
      canSendText: () => true,
      canSendSubject: () => false,
      canSendAttachments: () => true,
      isSupportedAttachmentUTI: (uti: string) => uti === 'public.png',
      attachments: [],
      addAttachmentURL: vi.fn(() => false),
      addAttachmentData: vi.fn(() => true),
      disableUserAttachments: vi.fn(),
      present: vi.fn(async (_animated, cb) => {
        finish = cb
      }),
      dismiss: vi.fn(async () => {}),
    }
    const { MFMessageComposeViewController: Message } = await load({}, message)
    expect(Message.canSendText()).toBe(true)
    expect(Message.canSendSubject()).toBe(false)
    expect(Message.isSupportedAttachmentUTI('bad')).toBe(false)
    const controller = new Message()
    controller.recipients = ['123']
    controller.body = 'hello'
    controller.subject = 'topic'
    expect(controller.recipients).toEqual(['123'])
    expect(controller.body).toBe('hello')
    expect(controller.subject).toBe('topic')
    controller.body = undefined
    expect(controller.body).toBeUndefined()
    expect(controller.addAttachmentURL('https://example.com/a')).toBe(false)
    const data = new ArrayBuffer(3)
    expect(controller.addAttachmentData(data, 'public.png', 'a.png')).toBe(true)
    expect(message.addAttachmentData).toHaveBeenCalledWith(data, 'public.png', 'a.png')
    const delegate = vi.fn()
    controller.messageComposeDelegate = { messageComposeViewController: delegate }
    await controller.present()
    finish('cancelled')
    expect(delegate).toHaveBeenCalledWith(controller, { didFinishWith: 'cancelled' })
    expect(message.dismiss).not.toHaveBeenCalled()
  })
  it('keeps unavailable presentation on the error channel', async () => {
    const { MFMailComposeViewController: Mail } = await load(
      {
        present: async () => {
          throw new Error('E_MAIL_COMPOSE_UNAVAILABLE: no account')
        },
      },
      {}
    )
    const controller = new Mail()
    const delegate = vi.fn()
    controller.mailComposeDelegate = { mailComposeController: delegate }
    await expect(controller.present()).rejects.toMatchObject({
      code: 'E_MAIL_COMPOSE_UNAVAILABLE',
    })
    expect(delegate).not.toHaveBeenCalled()
  })
})
