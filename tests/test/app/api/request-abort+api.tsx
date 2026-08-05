type Observation = {
  requestAborted: boolean
}

const observations = new Map<string, Observation>()

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || ''
  if (!token) return new Response('missing token', { status: 400 })

  if (url.searchParams.get('status') === '1') {
    return Response.json(observations.get(token) || { requestAborted: false })
  }

  const providerUrl = url.searchParams.get('providerUrl')
  if (!providerUrl) return new Response('missing providerUrl', { status: 400 })

  const observation = { requestAborted: request.signal.aborted }
  observations.set(token, observation)
  request.signal.addEventListener(
    'abort',
    () => {
      observation.requestAborted = true
    },
    { once: true }
  )

  const providerResponse = await fetch(providerUrl, { signal: request.signal })
  return new Response(providerResponse.body, {
    headers: { 'content-type': 'text/event-stream' },
  })
}
