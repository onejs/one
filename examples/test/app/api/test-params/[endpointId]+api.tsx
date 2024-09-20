// Helper function to get query parameter
const getQueryParam = (url: URL, param: string) => url.searchParams.get(param)

export async function GET(request: Request, { params: { endpointId } }) {
  const url = new URL(request.url)
  const testParam = getQueryParam(url, 'testParam')

  const responseData = {
    message: 'Route params test endpoint',
    endpointId,
    testParam,
  }

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: Request, { params: { endpointId } }) {
  try {
    const { testData } = await request.json()

    const responseData = {
      message: 'POST request received',
      endpointId,
      receivedData: testData,
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
