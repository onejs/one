export default (req: Request) => {
  console.log('wtf', req)
  console.log('wtf', req.headers)

  // 1. Get raw cookies from GitHub's OAuth response (via `Set-Cookie` headers)
  const setCookieHeaders = req.headers.get('Set-Cookie')

  // 2. Split multiple cookies correctly (handles commas in expiration dates)
  const cookiesToForward = setCookieHeaders?.split(/,\s*(?=[^;]+=)/) || []

  // 3. Prepare response headers
  const headers = new Headers({ 'Content-Type': 'text/html' })

  // 4. Forward cookies with original attributes
  cookiesToForward.forEach((cookie) => {
    if (!cookie) return
    headers.append('Set-Cookie', cookie)
  })

  console.log('cookiesToForward', cookiesToForward)

  return new Response(
    `

  `,
    {
      headers,
    }
  )
}
