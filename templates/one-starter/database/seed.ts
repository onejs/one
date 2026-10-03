import type * as schema from './schema'

import type { SeedData } from '@o/database'

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000
const now = Date.now()
const epoch = (msAgo: number) => now - msAgo
const photo = (id: string) => `/seed-media/${id}.jpg`

export default {
  userPublic: [
    {
      id: 'seed-user-maya',
      name: 'Maya Okafor',
      username: 'maya',
      image: null,
      joinedAt: epoch(40 * DAY),
    },
    {
      id: 'seed-user-arlo',
      name: 'Arlo Chen',
      username: 'arlo',
      image: null,
      joinedAt: epoch(32 * DAY),
    },
    {
      id: 'seed-user-nova',
      name: 'Nova Reyes',
      username: 'nova',
      image: null,
      joinedAt: epoch(21 * DAY),
    },
  ],
  post: [
    {
      id: 'seed-post-0',
      userId: 'seed-user-maya',
      image: photo('seed-post-0'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Morning light over the bay',
      createdAt: epoch(2 * HOUR),
    },
    {
      id: 'seed-post-1',
      userId: 'seed-user-arlo',
      image: photo('seed-post-1'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Found this little cafe downtown',
      createdAt: epoch(1 * DAY),
    },
    {
      id: 'seed-post-2',
      userId: 'seed-user-nova',
      image: photo('seed-post-2'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Trail run before the heat',
      createdAt: epoch(2 * DAY),
    },
    {
      id: 'seed-post-3',
      userId: 'seed-user-maya',
      image: photo('seed-post-3'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Weekend market haul',
      createdAt: epoch(3 * DAY),
    },
    {
      id: 'seed-post-4',
      userId: 'seed-user-arlo',
      image: photo('seed-post-4'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Sketching in the park',
      createdAt: epoch(4 * DAY),
    },
    {
      id: 'seed-post-5',
      userId: 'seed-user-nova',
      image: photo('seed-post-5'),
      imageWidth: 600,
      imageHeight: 600,
      caption: 'Late-night city walk',
      createdAt: epoch(5 * DAY),
    },
  ],
  comment: [
    {
      id: 'seed-comment-0',
      postId: 'seed-post-0',
      userId: 'seed-user-arlo',
      content: 'So good!',
      createdAt: epoch(1 * HOUR),
    },
    {
      id: 'seed-comment-1',
      postId: 'seed-post-0',
      userId: 'seed-user-nova',
      content: 'Love this one 🙌',
      createdAt: epoch(30 * MINUTE),
    },
    {
      id: 'seed-comment-2',
      postId: 'seed-post-1',
      userId: 'seed-user-maya',
      content: 'Adding this to my list',
      createdAt: epoch(20 * HOUR),
    },
  ],
} satisfies SeedData<typeof schema>
