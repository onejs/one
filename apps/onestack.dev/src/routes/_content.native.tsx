import { createFileRoute } from '@tanstack/react-router'
import { DocsLayout } from '~/features/docs/DocsLayout'
export const Route = createFileRoute('/_content/native')({ component: DocsLayout })
