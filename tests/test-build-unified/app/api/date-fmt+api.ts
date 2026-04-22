// dual-package (CJS/ESM) pure-JS dep — verifies no-externalize path
import { format } from 'date-fns'
import ms from 'ms'

export async function GET() {
  // use a noon-UTC date so local-time formatting doesn't cross a day boundary
  // regardless of which timezone workerd/miniflare runs in
  const d = new Date('2024-06-15T12:00:00Z')
  return Response.json({
    formatted: format(d, 'yyyy-MM-dd'),
    ms: ms('1h'),
  })
}
