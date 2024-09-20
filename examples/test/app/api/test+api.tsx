// Helper function to get query parameter
const getQueryParam = (url: URL, param: string) => url.searchParams.get(param)

// Mock data store
let testItems = [
  { id: 1, name: 'Test Item 1', description: 'Description for Test Item 1' },
  { id: 2, name: 'Test Item 2', description: 'Description for Test Item 2' },
]

export async function GET(request: Request) {
  const url = new URL(request.url)
  const forceError = getQueryParam(url, 'forceError')

  if (forceError === 'notFound') {
    return new Response(JSON.stringify({ error: 'Items not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (forceError === 'serverError') {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(testItems), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const forceError = getQueryParam(url, 'forceError')

  if (forceError === 'badRequest') {
    return new Response(JSON.stringify({ error: 'Invalid data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (forceError === 'serverError') {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { name, description } = await request.json()
    const newItem = {
      id: testItems.length + 1,
      name,
      description,
    }
    testItems.push(newItem)

    return new Response(JSON.stringify(newItem), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create item' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function PUT(request: Request) {
  const url = new URL(request.url)
  const forceError = getQueryParam(url, 'forceError')

  if (forceError === 'notFound') {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (forceError === 'serverError') {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const { id, name, description } = await request.json()

    const itemIndex = testItems.findIndex((item) => item.id === id)

    if (itemIndex === -1) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    testItems[itemIndex] = { ...testItems[itemIndex], name, description }

    return new Response(JSON.stringify(testItems[itemIndex]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to update item',
        message: error!.message,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const forceError = getQueryParam(url, 'forceError')

  if (forceError === 'notFound') {
    return new Response(JSON.stringify({ error: 'Item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (forceError === 'serverError') {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { id } = await request.json()
    const itemIndex = testItems.findIndex((item) => item.id === id)

    if (itemIndex === -1) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    testItems.splice(itemIndex, 1)

    return new Response(JSON.stringify({ success: true }), {
      status: 200, // Change this line to return 200 status
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete item' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
