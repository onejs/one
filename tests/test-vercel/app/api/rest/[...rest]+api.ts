export async function GET(_request: Request, { params }: { params: { rest: string } }) {
  return Response.json({ rest: params.rest })
}
