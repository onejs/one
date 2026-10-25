export function GET() {
  return Response.json({ calls: (globalThis as any).__searchParamsLoaderCalls ?? 0 })
}
