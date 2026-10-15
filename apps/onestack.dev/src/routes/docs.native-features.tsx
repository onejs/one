import { createFileRoute, redirect } from '@tanstack/react-router'
export const Route = createFileRoute('/docs/native-features')({ beforeLoad: () => { throw redirect({ to: '/native', statusCode: 301 }) } })
