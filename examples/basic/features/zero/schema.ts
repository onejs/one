const userSchema = {
  tableName: 'users',
  columns: {
    id: { type: 'number' },
    username: { type: 'string' },
    email: { type: 'string' },
    passwordHash: { type: 'string' },
    bio: { type: 'string' },
    avatarUrl: { type: 'string' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['id'],
} as const

const postSchema = {
  tableName: 'posts',
  columns: {
    id: { type: 'number' },
    userId: { type: 'number' },
    content: { type: 'string' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['id'],
  relationships: {
    user: {
      source: 'userId',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    likes: {
      source: 'id',
      dest: {
        field: 'postId',
        schema: () => likeSchema,
      },
    },
    reposts: {
      source: 'id',
      dest: {
        field: 'postId',
        schema: () => repostSchema,
      },
    },
    replies: {
      source: 'id',
      dest: {
        field: 'postId',
        schema: () => replySchema,
      },
    },
  },
} as const

const followSchema = {
  tableName: 'follows',
  columns: {
    followerId: { type: 'number' },
    followingId: { type: 'number' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['followerId', 'followingId'],
  relationships: {
    follower: {
      source: 'followerId',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    following: {
      source: 'followingId',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
  },
} as const

const likeSchema = {
  tableName: 'likes',
  columns: {
    userId: { type: 'number' },
    postId: { type: 'number' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['userId', 'postId'],
  relationships: {
    user: {
      source: 'userId',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    post: {
      source: 'postId',
      dest: {
        field: 'id',
        schema: () => postSchema,
      },
    },
  },
} as const

const repostSchema = {
  tableName: 'reposts',
  columns: {
    userId: { type: 'number' },
    postId: { type: 'number' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['userId', 'postId'],
  relationships: {
    user: {
      source: 'userId',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    post: {
      source: 'postId',
      dest: {
        field: 'id',
        schema: () => postSchema,
      },
    },
  },
} as const

const replySchema = {
  tableName: 'replies',
  columns: {
    id: { type: 'number' },
    userId: { type: 'number' },
    postId: { type: 'number' },
    content: { type: 'string' },
    createdAt: { type: 'number' },
  },
  primaryKey: ['id'],
  relationships: {
    user: {
      source: 'userId',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    post: {
      source: 'postId',
      dest: {
        field: 'id',
        schema: () => postSchema,
      },
    },
  },
} as const

export const schema = {
  users: userSchema,
  posts: postSchema,
  follows: followSchema,
  likes: likeSchema,
  reposts: repostSchema,
  replies: replySchema,
} as const

export type Schema = typeof schema
