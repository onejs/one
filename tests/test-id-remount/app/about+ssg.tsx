import { useId } from 'react'
import { Link } from 'one'

export default function AboutPage() {
  const id = useId()
  console.log('about page', id)

  return (
    <div id="about-page" data-testid={id}>
      <h1>About Page</h1>
      <p>This is the about page.</p>
      <Link href="/">Go to Home</Link>
      <br />
      {/* <Link href="/users/123">Go to User 123</Link> */}
    </div>
  )
}
