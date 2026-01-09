import { Link } from 'one'

export default function Home() {
  return (
    <div>
      <h1 data-testid="page-title">Home</h1>
      <Link href="/specific">Go to specific</Link>
      <Link href="/other">Go to other (dynamic)</Link>
    </div>
  )
}
