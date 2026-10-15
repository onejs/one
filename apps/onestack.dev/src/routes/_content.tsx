import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SearchProvider } from '~/features/search/SearchProvider'
export const Route = createFileRoute('/_content')({ component: Content })
function Content() { return <SearchProvider><Outlet /></SearchProvider> }
