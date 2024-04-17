export function GET(request: Request) {
  console.log('request', request)
  return { hello: 'world' }
}
