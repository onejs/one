import { adminClient } from 'better-auth/client/plugins'
import { platformClient } from './platformClient'

export const plugins = [adminClient(), platformClient()]
