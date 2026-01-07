// Helper function to get query parameter
const getQueryParam = (url: URL, param: string) => url.searchParams.get(param);

export async function GET(request: Request, { params: { parts } }) {
  const url = new URL(request.url);
  const testParam = getQueryParam(url, "testParam");

  const responseData = {
    message: "Parts endpoint",
    parts,
    testParam,
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request, { params: { parts } }) {
  try {
    const { testData } = await request.json();

    const responseData = {
      message: "POST request received",
      parts,
      receivedData: testData,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid request data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
