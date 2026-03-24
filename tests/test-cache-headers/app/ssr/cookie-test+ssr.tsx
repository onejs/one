import { type LoaderProps, setResponseHeaders, useLoader } from 'one'

export async function loader(props: LoaderProps) {
  await setResponseHeaders((headers) => {
    headers.set('Set-Cookie', 'test-cookie=hello; Path=/; HttpOnly')
  })

  return {
    message: 'Cookie test page',
    timestamp: Date.now(),
  }
}

export default function CookieTest() {
  const data = useLoader(loader)

  return (
    <div>
      <span id="message">{data.message}</span>
      <span id="timestamp">{data.timestamp}</span>
    </div>
  )
}
