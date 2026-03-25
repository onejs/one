import { usePathname } from 'one'

export default function SearchPage() {
  const pathname = usePathname()

  return <div id="group-page-pathname">{pathname}</div>
}
