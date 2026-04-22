// nested + dynamic — exercises the route flattening path in unified mode
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  return Response.json({ nested: true, slug: params.slug })
}
