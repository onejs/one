import { createFileRoute, Outlet } from '@tanstack/react-router'
import { TopNav } from '~/components/TopNav'
import { ContainerDocs } from '~/features/site/Containers'
export const Route = createFileRoute('/_content/plans')({ component: Plans })
function Plans() { return <><TopNav /><ContainerDocs><Outlet /></ContainerDocs></> }
