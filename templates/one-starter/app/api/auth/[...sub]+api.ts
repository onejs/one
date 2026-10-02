import type { Endpoint } from 'one'
import { authServer } from '~/features/auth/server/authServer'
export const GET: Endpoint = authServer.handler
export const POST: Endpoint = authServer.handler
