export function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: Date.now(),
    middleware: 'rewrite'
  })
}