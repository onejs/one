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
