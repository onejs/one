import { createMiddleware } from "one";

export default createMiddleware(async ({ request, next }) => {
  // throw new Error('meeee')

  // console.log('middleware here')
  // debugger

  if (request.url.includes(`test-middleware`)) {
    return Response.json({ middleware: "workssssss" });
  }

  const response = await next();

  if (!response && request.url.endsWith("/missing")) {
    return Response.json({ notFound: true });
  }

  return response;
});
