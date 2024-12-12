import pg from 'pg'
import * as unicodeEmoji from 'unicode-emoji'

const randomID = () => Math.random().toString(36).slice(2)

const connectionString = `postgresql://user:password@127.0.0.1/onechat`.replace(
  '127.0.0.1',
  'onechat_postgres'
)

console.info(`Connecting to: ${connectionString}`)

const pool = new pg.Pool({
  connectionString,
})

const emojis = unicodeEmoji.getEmojis().map((e) => e.emoji)

async function insertReactions() {
  const client = await connectWithRetry()
  try {
    await client.query('BEGIN')
    const insertText = `
      INSERT INTO reaction(id, value, "createdAt", "updatedAt") 
        VALUES ($1, $2, DEFAULT, DEFAULT)
        ON CONFLICT DO NOTHING;
      `
    for (let emoji of emojis) {
      const values = [randomID(), emoji]
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
    console.error(`Failed to connect to the database.\n${err}\nRetrying in 5 seconds...`)
    await new Promise((res) => setTimeout(res, 5000))
    return await pool.connect()
  }
}

connectWithRetry()
insertReactions()
  .then(() => {
    console.info('Reactions have been seeded')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error seeding reactions:', err)
    process.exit(1)
  })
