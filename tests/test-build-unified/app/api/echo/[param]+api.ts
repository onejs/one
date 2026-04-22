// nested + dynamic param route
export async function GET(
  request: Request,
  { params }: { params: { param: string } }
) {
  return Response.json({ echo: params.param })
}
