// plain api route, no extra deps — sanity baseline
export async function GET() {
  return Response.json({ hello: 'world' })
}
