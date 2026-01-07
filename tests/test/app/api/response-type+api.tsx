// Helper function to get query parameter
const getQueryParam = (url: URL, param: string) => url.searchParams.get(param);

const defaultResponse = {
  message: "Default response",
  data: "This is the default response data",
};

const jsonResponse = {
  message: "JSON response",
  data: { key: "value", description: "This is the JSON response data" },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const responseType = getQueryParam(url, "responseType");

  if (responseType === "json") {
    return Response.json(jsonResponse);
  }

  return new Response(JSON.stringify(defaultResponse), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
