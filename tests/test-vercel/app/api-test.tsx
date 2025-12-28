import { useState, useEffect } from 'react'
import { Link } from 'one'

export default function APITestPage() {
  const [basicResult, setBasicResult] = useState<string>('Loading...')
  const [paramsResult, setParamsResult] = useState<string>('Loading...')
  const [postResult, setPostResult] = useState<string>('Not tested')

  useEffect(() => {
    // Test basic API
    fetch('/api/hello')
      .then((r) => r.json())
      .then((d) => setBasicResult(JSON.stringify(d)))
      .catch((e) => setBasicResult(`Error: ${e.message}`))

    // Test API with params
    fetch('/api/echo/test-value?query=hello')
      .then((r) => r.json())
      .then((d) => setParamsResult(JSON.stringify(d)))
      .catch((e) => setParamsResult(`Error: ${e.message}`))
  }, [])

  const testPost = async () => {
    try {
      const response = await fetch('/api/hello', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'One Test' }),
      })
      const data = await response.json()
      setPostResult(JSON.stringify(data))
    } catch (e: any) {
      setPostResult(`Error: ${e.message}`)
    }
  }

  return (
    <div>
      <h1 id="api-test-title">API Test Page</h1>

      <section>
        <h2>GET /api/hello</h2>
        <p id="basic-api-result">{basicResult}</p>
      </section>

      <section>
        <h2>GET /api/echo/test-value?query=hello</h2>
        <p id="params-api-result">{paramsResult}</p>
      </section>

      <section>
        <h2>POST /api/hello</h2>
        <button id="test-post-btn" onClick={testPost}>
          Test POST
        </button>
        <p id="post-api-result">{postResult}</p>
      </section>

      <Link href="/" id="link-home">
        Back to Home
      </Link>
    </div>
  )
}
