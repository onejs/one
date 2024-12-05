-- Drop existing tables if they exist
DROP TABLE IF EXISTS "message", "thread", "channel", "serverMember", "server", "user";

-- Create user table
CREATE TABLE "user" (
    "id" VARCHAR PRIMARY KEY,
    "username" VARCHAR(200) NOT NULL UNIQUE,
    "displayName" VARCHAR(200),
    "email" VARCHAR(200) NOT NULL UNIQUE,
    "avatar" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create server table
CREATE TABLE "server" (
    "id" VARCHAR PRIMARY KEY,
    "name" VARCHAR(200) NOT NULL,
    "ownerId" UUID REFERENCES "user"(id),
    "description" TEXT,
    "icon" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create serverMember junction table (for many-to-many relationship between servers and users)
CREATE TABLE "serverMember" (
    "serverId" UUID REFERENCES "server"(id),
    "userId" UUID REFERENCES "user"(id),
    "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("serverId", "userId")
);

-- Create channel table
CREATE TABLE "channel" (
    "id" VARCHAR PRIMARY KEY,
    "serverId" UUID REFERENCES "server"(id),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "private" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create thread table
CREATE TABLE "thread" (
    "id" VARCHAR PRIMARY KEY,
    "channelId" UUID REFERENCES "channel"(id),
    "creatorId" UUID REFERENCES "user"(id),
    "title" VARCHAR(200),
    "description" VARCHAR(200),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message table
CREATE TABLE "message" (
    "id" VARCHAR PRIMARY KEY,
    "serverId" UUID REFERENCES "server"(id),
    "channelId" UUID REFERENCES "channel"(id),
    "threadId" UUID REFERENCES "thread"(id) NULL,
    "senderId" UUID REFERENCES "user"(id),
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP WITH TIME ZONE NULL,
    "deleted" BOOLEAN DEFAULT FALSE
);
