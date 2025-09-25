export function GET() {
  return Response.json({
    message: 'Direct response from middleware',
    timestamp: Date.now(),
    source: 'test-middleware-response'
  })
}