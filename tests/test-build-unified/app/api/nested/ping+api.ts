// inside a nested middleware — verifies nested mw runs on this route
export async function GET() {
  return Response.json({ pong: true })
}
