import pg from 'pg'
import * as unicodeEmoji from 'unicode-emoji'

const randomId = () => Math.random().toString(36).slice(2)
const connectionString = process.env.ZERO_UPSTREAM_DB?.replace('127.0.0.1', 'pgdb') || ''

console.info(`Connecting to: ${connectionString}`)

const pool = new pg.Pool({ connectionString })

async function insertSeedData() {
  const client = await connectWithRetry()
  try {
    await client.query('BEGIN')

    // Test User
    await client.query(`
      INSERT INTO "user" (
        id, username, name, email, state, "emailVerified", image, "createdAt", "updatedAt"
      ) VALUES (
        'test-user-id',
        'testuser',
        'Test User',
        'testuser@example.com',
        '{"activeChannels":{}}',
        true,
        'https://one1.dev/onechatimages/uploads/np424wtl8z-avatar.png',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON CONFLICT (id) DO NOTHING;
    `)

    // Test Server
    await client.query(`
      INSERT INTO server (
        id, name, "creatorId", description, icon, "channelSort", "createdAt"
      ) VALUES (
        'test-server-id',
        'Test Server',
        'test-user-id',
        'This is a test server.',
        'https://one1.dev/onechatimages/uploads/np424wtl8z-avatar.png',
        '["test-channel-id"]',
        CURRENT_TIMESTAMP
      ) ON CONFLICT (id) DO NOTHING;
    `)

    // Default Channel
    await client.query(`
      INSERT INTO channel (
        id, "serverId", name, description, private, "createdAt"
      ) VALUES (
        'test-channel-id',
        'test-server-id',
        'general',
        'This is a default channel.',
        false,
        CURRENT_TIMESTAMP
      ) ON CONFLICT (id) DO NOTHING;
    `)

    // Server Member
    await client.query(`
      INSERT INTO "serverMember" (
        "serverId", "userId", "joinedAt"
      ) VALUES (
        'test-server-id',
        'test-user-id',
        CURRENT_TIMESTAMP
      ) ON CONFLICT ("serverId", "userId") DO NOTHING;
    `)

    // Reactions
    const emojis = unicodeEmoji.getEmojis()
    const values = emojis.map((emoji) => ({
      id: randomId(),
      value: emoji.emoji,
      keyword: emoji.description.split(' ').join('_'),
    }))

    // Clear existing reactions
    await client.query('DELETE FROM reaction')

    // Insert reactions in batches
    for (let i = 0; i < values.length; i += 100) {
      const batch = values.slice(i, i + 100)
      const valueStrings = batch.map(
        (_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`
      )
      const query = {
        text: `
          INSERT INTO reaction (id, value, keyword)
          VALUES ${valueStrings.join(',')}
        `,
        values: batch.flatMap((v) => [v.id, v.value, v.keyword]),
      }
      await client.query(query)
    }

    await client.query('COMMIT')
    console.info('Seed data has been inserted successfully.')
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

insertSeedData()
  .then(() => {
    console.info('Seed data insertion complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error during seed data insertion:', err)
    process.exit(1)
  })
