// axios is a classic node-first CJS package that references node:http / node:https.
// we don't actually make a request here — just verify the module bundles and
// its public shape is reachable at runtime (this is the class of package that
// breaks builds under ssr.noExternal: true + rolldown).
import axios from 'axios'

export async function GET() {
  return Response.json({
    loaded: typeof axios === 'function' || typeof axios === 'object',
    hasGet: typeof axios?.get === 'function',
    hasPost: typeof axios?.post === 'function',
  })
}
