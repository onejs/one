export async function GET() {
  return Response.json({ grouped: true })
}

export async function HEAD() {
  return new Response(null, {
    headers: {
      'x-group-head-ok': 'true',
    },
  })
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': request.headers.get('origin') || '*',
      'access-control-allow-methods': 'GET, HEAD, OPTIONS',
      'access-control-allow-headers':
        request.headers.get('access-control-request-headers') || '*',
    },
  })
}
