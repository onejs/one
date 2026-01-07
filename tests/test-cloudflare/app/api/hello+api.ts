export async function GET(request: Request) {
  return new Response(
    JSON.stringify({
      message: "Hello from One API!",
      timestamp: Date.now(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function POST(request: Request) {
  const body = await request.json();

  return new Response(
    JSON.stringify({
      message: `Hello, ${body.name || "World"}!`,
      received: body,
      timestamp: Date.now(),
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    },
  );
}
