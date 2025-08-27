export async function GET() {
  return Response.json({
    version: 'v2',
    users: [
      { id: 1, name: 'User 1' },
      { id: 2, name: 'User 2' }
    ]
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  return Response.json({
    version: 'v2',
    created: true,
    data: body
  })
}