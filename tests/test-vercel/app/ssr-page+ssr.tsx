import { Link, useLoader } from "one";

export async function loader({ request }: { request?: Request }) {
  // Handle SSR build where request may not be available
  const url = request ? new URL(request.url) : null;
  return {
    message: "Hello from SSR loader!",
    timestamp: Date.now(),
    path: url?.pathname ?? "/ssr-page",
    query: url ? Object.fromEntries(url.searchParams.entries()) : {},
  };
}

export default function SSRPage() {
  const data = useLoader(loader);

  return (
    <div>
      <h1 id="ssr-title">SSR Page</h1>
      <p id="render-mode">Mode: SSR</p>
      <p id="loader-message">{data.message}</p>
      <p id="loader-timestamp">Timestamp: {data.timestamp}</p>
      <p id="loader-path">Path: {data.path}</p>
      <p id="loader-query">Query: {JSON.stringify(data.query)}</p>

      <Link href="/" id="link-home">
        Back to Home
      </Link>
    </div>
  );
}
