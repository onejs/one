import { Link } from 'one'
import { Status } from '~/components/Status'

export function ReleaseStatus() {
  return (
    <Link href="/docs/status">
      <Status cur="pointer" is="beta" />
    </Link>
  )
}
