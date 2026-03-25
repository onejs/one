import { usePathname } from 'one'

export default function FeedPage() {
  const pathname = usePathname()

  return <div id="group-page-pathname">{pathname}</div>
}
