// pure ESM dep — should bundle cleanly
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1) })

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ ok: false, errors: parsed.error.issues }, { status: 400 })
  }
  return Response.json({ ok: true, name: parsed.data.name })
}
