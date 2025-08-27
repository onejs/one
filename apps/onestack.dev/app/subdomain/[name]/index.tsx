import { Link, useParams, useLoader } from 'one'

export default function SubdomainPage() {
  const params = useParams<{ name: string }>()
  const data = useLoader(loader)
  const name = params?.name || 'unknown'
  
  return (
    <div style={{ padding: 20 }}>
      <h1>Subdomain: {name}</h1>
      <p>This page is served from the rewritten path /subdomain/{name}</p>
      
      <div style={{ marginTop: 20 }}>
        <h2>Test Links (should show external URLs):</h2>
        <ul>
          <li>
            <Link href={`/subdomain/${name}/about`}>
              About Page (should render as {name}.localhost/about)
            </Link>
          </li>
          <li>
            <Link href="/subdomain/other/page">
              Other Subdomain (should render as other.localhost/page)
            </Link>
          </li>
          <li>
            <Link href="/docs/intro">
              Docs (regular link, no rewrite)
            </Link>
          </li>
        </ul>
      </div>
      
      <div style={{ marginTop: 20 }}>
        <h3>Debug Info:</h3>
        <pre>{JSON.stringify({ params, loaderData: data }, null, 2)}</pre>
      </div>
    </div>
  )
}

export async function loader({ params }: { params: { name: string } }) {
  return {
    subdomain: params.name,
    timestamp: Date.now(),
    message: `Loaded subdomain: ${params.name}`
  }
}