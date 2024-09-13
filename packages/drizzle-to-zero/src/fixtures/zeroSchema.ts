const userSchema = {
  tableName: 'users',
  columns: {
    id: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    passwordHash: { type: 'string' },
    bio: { type: 'string' },
    avatar_url: { type: 'string' },
    created_at: { type: 'number' },
  },
  primaryKey: ['id'],
} as const

const postSchema = {
  tableName: 'posts',
  columns: {
    id: { type: 'string' },
    user_id: { type: 'string' },
    content: { type: 'string' },
    created_at: { type: 'number' },
  },
  primaryKey: ['id'],
  relationships: {
    user: {
      source: 'user_id',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    likes: {
      source: 'id',
      dest: {
        field: 'post_id',
        schema: () => likeSchema,
      },
    },
    reposts: {
      source: 'id',
      dest: {
        field: 'post_id',
        schema: () => repostSchema,
      },
    },
    replies: {
      source: 'id',
      dest: {
        field: 'post_id',
        schema: () => replySchema,
      },
    },
  },
} as const

const followSchema = {
  tableName: 'follows',
  columns: {
    follower_id: { type: 'string' },
    following_id: { type: 'string' },
    created_at: { type: 'number' },
  },
  primaryKey: ['follower_id', 'following_id'],
  relationships: {
    follower: {
      source: 'follower_id',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    following: {
      source: 'following_id',
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
    user_id: { type: 'string' },
    post_id: { type: 'string' },
    created_at: { type: 'number' },
  },
  primaryKey: ['user_id', 'post_id'],
  relationships: {
    user: {
      source: 'user_id',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    post: {
      source: 'post_id',
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
    user_id: { type: 'string' },
    post_id: { type: 'string' },
    created_at: { type: 'number' },
  },
  primaryKey: ['user_id', 'post_id'],
  relationships: {
    user: {
      source: 'user_id',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    post: {
      source: 'post_id',
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
    id: { type: 'string' },
    user_id: { type: 'string' },
    post_id: { type: 'string' },
    content: { type: 'string' },
    created_at: { type: 'number' },
  },
  primaryKey: ['id'],
  relationships: {
    user: {
      source: 'user_id',
      dest: {
        field: 'id',
        schema: () => userSchema,
      },
    },
    post: {
      source: 'post_id',
      dest: {
        field: 'id',
        schema: () => postSchema,
      },
    },
  },
} as const

export const zeroSchema = {
  users: userSchema,
  posts: postSchema,
  follows: followSchema,
  likes: likeSchema,
  reposts: repostSchema,
  replies: replySchema,
} as const
