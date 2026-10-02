import { drizzleZeroConfig } from 'drizzle-zero'
import * as schema from '../data/generated/drizzleSchema'

export default drizzleZeroConfig(schema, { suppressDefaultsWarning: true })
