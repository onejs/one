export async function GET(request: Request) {
  return new Response(JSON.stringify({ api: "works under app-cases/basic/app" }), {
    headers: { "Content-Type": "application/json" },
  });
}
