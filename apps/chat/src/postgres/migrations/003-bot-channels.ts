import type { PoolClient } from 'pg'

export async function up(client: PoolClient) {
  await client.query(`
    ALTER TABLE channel ADD COLUMN type VARCHAR(255);
  `)
}
