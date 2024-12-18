import pg from 'pg'

/**
 * This is an example file that you can use to seed your DB using TypeScript
 */

const connectionString = `postgresql://user:password@127.0.0.1/postgres`.replace(
  '127.0.0.1',
  'postgres'
)

console.info(`Connecting to: ${connectionString}`)

const pool = new pg.Pool({
  connectionString,
})

async function insertReactions() {
  const client = await connectWithRetry()
  try {
    await client.query('BEGIN')

    // use client to insert data here

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

connectWithRetry().then(() => {
  insertReactions()
    .then(() => {
      console.info('Seeding complete')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Error seeding:', err)
      process.exit(1)
    })
})
