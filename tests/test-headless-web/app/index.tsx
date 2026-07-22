import { Link } from 'one'

export default function Home() {
  return (
    <main data-testid="home">
      <h1>headless home</h1>
      <Link href="/about" data-testid="to-about">
        about
      </Link>
      <Link href="/feed" data-testid="to-feed">
        feed
      </Link>
    </main>
  )
}
