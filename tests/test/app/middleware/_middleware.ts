import { createMiddleware, setResponseHeaders } from "one";

export default createMiddleware(({ request }) => {
  if (request.url.includes("intercept")) {
    return Response.json({ didIntercept: true });
  }

  setResponseHeaders((headers) => {
    headers.append("test-header", "test-value");
  });
});
