export async function prettyPrintResponse(responseIn: Response) {
  const response = responseIn.clone()

  const responseDetails = {
    status: response.status,
    statusText: response.statusText,
    headers: {},
    body: response.body ? await streamToString(response.body) : null,
  }

  const headersMap = response.headers
  // @ts-ignore
  for (const [key, value] of headersMap.entries()) {
    // @ts-expect-error
    responseDetails.headers[key] = value
  }

  console.info(responseDetails)
}

async function streamToString(stream: ReadableStream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
    }
  } catch (error) {
    console.error('Error reading the stream:', error)
  } finally {
    reader.releaseLock()
  }

  return result
}
