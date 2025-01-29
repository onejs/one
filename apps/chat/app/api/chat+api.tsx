import { streamText } from 'ai'
import { models } from '@vxrn/strip'
import { getBody } from 'better-auth'

export default async (req: Request): Promise<Response> => {
  const body = await getBody(req)
  const { textStream } = streamText({
    model: models['deepseek-chat'],
    prompt: body.prompt || 'hi',
  })
  return new Response(textStream)
}
