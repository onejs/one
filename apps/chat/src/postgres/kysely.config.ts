import { defineConfig } from 'kysely-ctl'
import { Pool } from 'pg'

export default defineConfig({
  dialect: 'pg',
  dialectConfig: {
    pool: new Pool({
      connectionString: process.env.ZERO_UPSTREAM_DB,
    }),
  },
})
