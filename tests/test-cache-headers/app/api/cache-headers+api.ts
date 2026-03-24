// For API routes, set headers directly on the Response (simpler pattern)
export async function GET(request: Request) {
  return new Response(
    JSON.stringify({
      message: 'API with cache headers',
      timestamp: Date.now(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Api-Cache': 'enabled',
      },
    }
  )
}
