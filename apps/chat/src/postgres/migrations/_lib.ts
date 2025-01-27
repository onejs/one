import pg from 'pg'

export const randomId = () => Math.random().toString(36).slice(2)

export const getClient = async (tries = 0): Promise<pg.PoolClient> => {
  try {
    const connectionString = process.env.ZERO_UPSTREAM_DB?.replace('127.0.0.1', 'pgdb') || ''
    console.info(`Connecting to: ${connectionString}`)
    const pool = new pg.Pool({
      connectionString,
    })
    return await pool.connect()
  } catch (err) {
    if (tries > 5) {
      console.error(`Cannot connect :/`)
      process.exit(1)
    }
    console.error(`Failed to connect to the database.\n${err}\nRetrying in 8 seconds...`)
    await new Promise((res) => setTimeout(res, 8000))
    return await getClient(tries + 1)
  }
}
