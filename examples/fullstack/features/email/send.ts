import * as postmark from 'postmark'

const serverToken = process.env.POSTMARK_SERVER_TOKEN || ''

const client = new postmark.ServerClient(serverToken)

// just an example

export function sendEmail(email: string, args: { name: string; product_name: string }) {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`Not sending email to ${email} since we're not on prod.`)
    return
  }

  return client.sendEmailWithTemplate({
    From: 'name@example.com',
    To: email,
    TemplateId: 123,
    TemplateModel: args,
  })
}
