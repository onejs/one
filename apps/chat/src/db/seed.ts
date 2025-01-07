import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { channel, server, serverMember, user } from './publicSchema'

const connectionString = process.env.ZERO_UPSTREAM_DB.replace('127.0.0.1', 'pgdb')

console.info(`Connecting to: ${connectionString}`)

const pool = new pg.Pool({
  connectionString,
})

const db = drizzle(pool)

async function insertSeedData() {
  try {
    // Seed the test user
    const testUser = {
      id: 'test-user-id',
      username: 'testuser',
      name: 'Test User',
      email: 'testuser@example.com',
      state: {
        activeChannels: {},
      },
      emailVerified: true,
      image: 'https://one1.dev/onechatimages/uploads/np424wtl8z-avatar.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.insert(user).values(testUser).onConflictDoNothing()

    // Seed the test server
    const testServer = {
      id: 'test-server-id',
      name: 'Test Server',
      creatorId: 'test-user-id',
      description: 'This is a test server.',
      icon: 'https://one1.dev/onechatimages/uploads/np424wtl8z-avatar.png',
      channelSort: ['test-channel-id'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.insert(server).values(testServer).onConflictDoNothing()

    // Seed the default channel for the server
    const testChannel = {
      id: 'test-channel-id',
      serverId: 'test-server-id',
      name: 'general',
      description: 'This is a default channel.',
      private: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.insert(channel).values(testChannel).onConflictDoNothing()

    // Add the user to the server
    const testServerMember = {
      serverId: 'test-server-id',
      userId: 'test-user-id',
      hasClosedWelcome: false,
      joinedAt: new Date(),
    }
    await db.insert(serverMember).values(testServerMember).onConflictDoNothing()

    console.info('Seed data has been inserted successfully.')
  } catch (e) {
    console.error('Error inserting seed data:', e)
    throw e
  } finally {
    await pool.end() // Close the connection pool
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
