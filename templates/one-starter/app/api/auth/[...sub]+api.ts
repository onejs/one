import { authServer } from '~/auth/server/authServer'
import type { Endpoint } from 'one'

const handler: Endpoint = (request) => authServer.handler(request)
export const GET = handler
export const POST = handler
