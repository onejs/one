import { Link } from 'one'
import { useState, useEffect } from 'react'

export default function TestRewritesPage() {
  const [middlewareResponse, setMiddlewareResponse] = useState<any>(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [linkHrefs, setLinkHrefs] = useState<Record<string, string>>({})
  
  useEffect(() => {
    // Set current URL on client
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
      
      // Check what hrefs are actually rendered
      setTimeout(() => {
        const links = document.querySelectorAll('a[data-test-link]')
        const hrefs: Record<string, string> = {}
        links.forEach((link) => {
          const testId = link.getAttribute('data-test-link')
          if (testId) {
            hrefs[testId] = link.getAttribute('href') || ''
          }
        })
        setLinkHrefs(hrefs)
      }, 100)
    }
  }, [])
  
  const testMiddlewareResponse = async () => {
    try {
      const res = await fetch('/test-middleware-response')
      const data = await res.json()
      setMiddlewareResponse(data)
    } catch (err: any) {
      setMiddlewareResponse({ error: err.message })
    }
  }
  
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>URL Rewriting Test Page</h1>
      
      <div style={{ 
        padding: 20, 
        background: '#f0f4f8', 
        borderRadius: 8, 
        marginBottom: 30 
      }}>
        <h2 style={{ fontSize: 20, marginBottom: 10 }}>Current URL</h2>
        <code style={{ 
          display: 'block', 
          padding: 10, 
          background: 'white', 
          borderRadius: 4,
          wordBreak: 'break-all'
        }}>
          {currentUrl || 'Loading...'}
        </code>
      </div>
      
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 20, marginBottom: 15 }}>Test Subdomain Links</h2>
        <p style={{ marginBottom: 10 }}>These links should render with subdomain URLs when rewrites are configured:</p>
        <ul style={{ lineHeight: 2 }}>
          <li>
            <Link href="/subdomain/app1" data-test-link="app1">
              App1 Subdomain → /subdomain/app1
            </Link>
            {linkHrefs.app1 && (
              <span style={{ marginLeft: 10, color: '#666', fontSize: 14 }}>
                (renders as: {linkHrefs.app1})
              </span>
            )}
          </li>
          <li>
            <Link href="/subdomain/app2/dashboard" data-test-link="app2-dashboard">
              App2 Dashboard → /subdomain/app2/dashboard
            </Link>
            {linkHrefs['app2-dashboard'] && (
              <span style={{ marginLeft: 10, color: '#666', fontSize: 14 }}>
                (renders as: {linkHrefs['app2-dashboard']})
              </span>
            )}
          </li>
          <li>
            <Link href="/subdomain/test/about" data-test-link="test-about">
              Test About → /subdomain/test/about
            </Link>
            {linkHrefs['test-about'] && (
              <span style={{ marginLeft: 10, color: '#666', fontSize: 14 }}>
                (renders as: {linkHrefs['test-about']})
              </span>
            )}
          </li>
        </ul>
      </div>
      
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 20, marginBottom: 15 }}>Test Path Rewrites</h2>
        <p style={{ marginBottom: 10 }}>These demonstrate path-based rewrites:</p>
        <ul style={{ lineHeight: 2 }}>
          <li>
            <Link href="/docs/intro" data-test-link="docs">
              Regular docs link → /docs/intro (no rewrite)
            </Link>
          </li>
          <li>
            <Link href="/old-docs/intro" data-test-link="old-docs">
              Old docs link → /old-docs/intro (should rewrite to /docs/intro)
            </Link>
          </li>
        </ul>
      </div>
      
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 20, marginBottom: 15 }}>Test Middleware Response</h2>
        <p style={{ marginBottom: 10 }}>Test that middleware can return responses directly:</p>
        <button 
          onClick={testMiddlewareResponse}
          style={{
            padding: '10px 20px',
            background: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16
          }}
        >
          Test Middleware Response
        </button>
        
        {middlewareResponse && (
          <pre style={{ 
            marginTop: 15, 
            background: '#f0f4f8', 
            padding: 15, 
            borderRadius: 4,
            overflow: 'auto'
          }}>
            {JSON.stringify(middlewareResponse, null, 2)}
          </pre>
        )}
      </div>
      
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffecb5',
        borderRadius: 8,
        padding: 20,
        marginBottom: 30
      }}>
        <h2 style={{ fontSize: 20, marginBottom: 15 }}>Testing Instructions</h2>
        <ol style={{ lineHeight: 1.8, paddingLeft: 20 }}>
          <li>
            <strong>Test subdomain routing locally:</strong>
            <ul style={{ marginTop: 5, marginBottom: 10 }}>
              <li>Visit <code style={{ background: '#f0f4f8', padding: '2px 6px', borderRadius: 3 }}>http://app1.localhost:6173</code></li>
              <li>Should show the subdomain page with "app1" as the subdomain</li>
            </ul>
          </li>
          <li>
            <strong>Test Link rendering:</strong>
            <ul style={{ marginTop: 5, marginBottom: 10 }}>
              <li>Check the "renders as:" text next to each link above</li>
              <li>Subdomain links should show as <code>*.localhost</code> URLs if rewrites are working</li>
            </ul>
          </li>
          <li>
            <strong>Test navigation:</strong>
            <ul style={{ marginTop: 5, marginBottom: 10 }}>
              <li>Click on subdomain links</li>
              <li>Should navigate correctly with proper URL in address bar</li>
            </ul>
          </li>
          <li>
            <strong>Test middleware response:</strong>
            <ul style={{ marginTop: 5, marginBottom: 10 }}>
              <li>Click the button above</li>
              <li>Should receive JSON response directly from middleware</li>
            </ul>
          </li>
        </ol>
      </div>
      
      <div style={{ 
        background: '#d1ecf1',
        border: '1px solid #bee5eb',
        borderRadius: 8, 
        padding: 20 
      }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>Direct Subdomain Test URLs</h3>
        <p style={{ marginBottom: 10 }}>The <code>.localhost</code> domain automatically resolves to 127.0.0.1 on modern systems.</p>
        <p style={{ marginBottom: 10 }}>Try these URLs directly in your browser:</p>
        <ul style={{ fontFamily: 'monospace', lineHeight: 1.8 }}>
          <li>
            <a href="http://app1.localhost:6173" target="_blank" rel="noopener noreferrer">
              http://app1.localhost:6173
            </a> → Should show "Subdomain: app1"
          </li>
          <li>
            <a href="http://app2.localhost:6173" target="_blank" rel="noopener noreferrer">
              http://app2.localhost:6173
            </a> → Should show "Subdomain: app2"
          </li>
          <li>
            <a href="http://docs.localhost:6173" target="_blank" rel="noopener noreferrer">
              http://docs.localhost:6173
            </a> → Should redirect to docs
          </li>
        </ul>
      </div>
      
      <div style={{ 
        marginTop: 30,
        padding: 20,
        background: '#e8f5e9',
        border: '1px solid #c8e6c9',
        borderRadius: 8
      }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>Configuration Used</h3>
        <pre style={{ 
          background: 'white', 
          padding: 15, 
          borderRadius: 4,
          overflow: 'auto'
        }}>
{`// vite.config.ts
{
  web: {
    rewrites: {
      '*.localhost': '/subdomain/*',
      'docs.localhost': '/docs',
      '/old-docs/*': '/docs/*',
    }
  }
}`}
        </pre>
      </div>
    </div>
  )
}