import { createMiddleware } from "one";

export default createMiddleware(async ({ request, next }) => {
  if (request.url.includes(`test-middleware`)) {
    return Response.json({ middleware: "works under app-cases/basic/app" });
  }

  return await next();
});
