import type { PoolClient } from 'pg'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function up(client: PoolClient) {
  const seedFilePath = join(__dirname, '001-init.sql')
  const seedSql = await readFile(seedFilePath, 'utf-8')
  await client.query(seedSql)
}
