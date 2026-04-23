// regression test for dev-mode OPTIONS reaching api route handlers. without
// preflightContinue in the vxrn default server.cors config, Vite's built-in
// cors middleware answers this preflight with wildcard headers before our
// handler runs.
export async function GET() {
  return Response.json({ cors: 'works' })
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  const reqHeaders = request.headers.get('access-control-request-headers') || '*'
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': reqHeaders,
      'x-one-options-handler': 'user',
    },
  })
}
