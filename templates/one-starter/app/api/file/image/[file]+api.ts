import { server } from '~/env'
import type { Endpoint } from 'one'

// local uploads live beside the SQLite database; production serves objects through R2.
export const GET: Endpoint = async (request) => {
  const file = new URL(request.url).pathname.split('/').at(-1) || ''
  if (!/^[a-zA-Z0-9_-]+\.(jpg|png|webp|gif)$/.test(file)) {
    return new Response(null, { status: 404 })
  }
  if (process.env.NODE_ENV !== 'development') {
    return Response.redirect(`${server.CLOUDFLARE_R2_PUBLIC_URL}/uploads/${file}`, 302)
  }
  const { readFile } = await import('node:fs/promises')
  try {
    const bytes = await readFile(`${process.cwd()}/.orez/uploads/${file}`)
    const extension = file.split('.').at(-1)
    const contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`
    return new Response(new Uint8Array(bytes).buffer, { headers: { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response(null, { status: 404 })
    throw error
  }
}
