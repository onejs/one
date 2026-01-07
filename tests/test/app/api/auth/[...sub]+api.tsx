export async function GET(request: Request, { params: { sub } }) {
  const url = new URL(request.url);

  const responseData = {
    message: "Auth endpoint",
    sub,
    path: url.pathname,
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request, { params: { sub } }) {
  const responseData = {
    message: "Auth POST endpoint",
    sub,
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
