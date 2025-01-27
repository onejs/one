import * as unicodeEmoji from 'unicode-emoji'
import { getClient, randomId } from './_lib'
import type { PoolClient } from 'pg'

export async function up(client: PoolClient) {
  const emojis = unicodeEmoji.getEmojis()
  await client.query('BEGIN')
  const insertText = `
      INSERT INTO reaction(id, value, keyword, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, DEFAULT, DEFAULT)
        ON CONFLICT DO NOTHING;
      `
  for (let emoji of emojis) {
    const values = [randomId(), emoji.emoji, toKeyword(emoji.description)]
    await client.query(insertText, values)
  }
  await client.query('COMMIT')
}

const toKeyword = (description: string) => description.split(' ').join('_')
