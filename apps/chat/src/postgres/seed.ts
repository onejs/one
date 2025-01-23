import pg from 'pg'
import * as unicodeEmoji from 'unicode-emoji'

const randomId = () => Math.random().toString(36).slice(2)

const connectionString = process.env.ZERO_UPSTREAM_DB?.replace('127.0.0.1', 'pgdb') || ''

console.info(`Connecting to: ${connectionString}`)

const pool = new pg.Pool({
  connectionString,
})

const emojis = unicodeEmoji.getEmojis()

const toKeyword = (description: string) => description.split(' ').join('_')

async function insertReactions() {
  const client = await connectWithRetry()
  try {
    await client.query('BEGIN')
    const values = emojis.map((emoji) => ({
      id: randomId(),
      value: emoji.emoji,
      keyword: toKeyword(emoji.description),
      created_at: new Date(),
      updated_at: new Date(),
    }))

    const valueStrings = values.map(
      (_, index) =>
        `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`
    )

    const query = {
      text: `
        INSERT INTO reaction (
          id,
          value,
          keyword,
          created_at,
          updated_at
        )
        VALUES ${valueStrings.join(',')}
      `,
      values: values.flatMap((v) => [v.id, v.value, v.keyword, v.created_at, v.updated_at]),
    }
    await client.query(query)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

const connectWithRetry = async () => {
  try {
    return await pool.connect()
  } catch (err) {
    console.error(`Failed to connect to the database.\n${err}\nRetrying in 8 seconds...`)
    await new Promise((res) => setTimeout(res, 8000))
    return await pool.connect()
  }
}

connectWithRetry().then(() => {
  insertReactions()
    .then(() => {
      console.info('Reactions have been seeded')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Error seeding reactions:', err)
      process.exit(1)
    })
})
