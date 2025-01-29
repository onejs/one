import type { Endpoint } from 'one'
import { authAPIHandler } from '~/better-auth/apiHandler'

export const GET: Endpoint = authAPIHandler('GET')
export const POST: Endpoint = authAPIHandler('POST')
