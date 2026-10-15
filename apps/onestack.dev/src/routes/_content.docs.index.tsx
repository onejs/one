import { createFileRoute, redirect } from '@tanstack/react-router'
export const Route = createFileRoute('/_content/docs/')({ beforeLoad: () => { throw redirect({ to: '/docs/$slug', params: { slug: 'introduction' }, statusCode: 301 }) } })
