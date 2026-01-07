export async function GET(request: Request, { params }: { params: { param: string } }) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");

  return new Response(
    JSON.stringify({
      param: params.param,
      query,
      fullUrl: request.url,
      timestamp: Date.now(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function POST(request: Request, { params }: { params: { param: string } }) {
  const body = await request.json();

  return new Response(
    JSON.stringify({
      param: params.param,
      body,
      timestamp: Date.now(),
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    },
  );
}
