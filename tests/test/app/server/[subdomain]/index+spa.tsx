export default function SubdomainServerPage({ params }: { params: { subdomain: string } }) {
  return (
    <div>
      <h1>Server: {params.subdomain}</h1>
      <p>This page is served from the rewritten path /server/{params.subdomain}</p>
    </div>
  )
}