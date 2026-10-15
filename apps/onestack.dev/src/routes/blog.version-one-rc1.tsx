import { createFileRoute, redirect } from '@tanstack/react-router'
export const Route = createFileRoute('/blog/version-one-rc1')({ beforeLoad: () => { throw redirect({ to: '/blog/$slug', params: { slug: 'version-one' }, statusCode: 301 }) } })
