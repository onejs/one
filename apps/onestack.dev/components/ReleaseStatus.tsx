import { Link } from 'one'
import { Status } from '~/components/Status'

export function ReleaseStatus() {
  return (
    <Link href="/docs/status">
      <Status cur="pointer" is="beta" text="RC.1" />
    </Link>
  )
}
