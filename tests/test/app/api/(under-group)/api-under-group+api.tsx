export async function GET(request: Request) {
  return new Response(JSON.stringify({ api: 'works' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
