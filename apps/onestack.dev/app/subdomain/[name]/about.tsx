import { Link, useParams } from 'one'

export default function SubdomainAboutPage() {
  const params = useParams<{ name: string }>()
  const name = params?.name || 'unknown'
  
  return (
    <div style={{ padding: 20 }}>
      <h1>About - {name}</h1>
      <p>This is the about page for subdomain: {name}</p>
      
      <div style={{ marginTop: 20 }}>
        <Link href={`/subdomain/${name}`}>
          ← Back to {name} home
        </Link>
      </div>
      
      <div style={{ marginTop: 20 }}>
        <h2>Navigation Test</h2>
        <p>The link above should render with the subdomain URL.</p>
        <p>Current path: /subdomain/{name}/about</p>
        <p>Should display as: {name}.localhost/about</p>
      </div>
    </div>
  )
}