-- Drop existing tables if they exist
DROP TABLE IF EXISTS "message",
"thread",
"channel",
"serverMember",
"server",
"user";

CREATE DATABASE onechat;
CREATE DATABASE onechat_cvr;
CREATE DATABASE onechat_cdb;

\c onechat;

-- Create user table
CREATE TABLE "user" (
    "id" VARCHAR PRIMARY KEY,
    "username" VARCHAR(200),
    "name" VARCHAR(200),
    "email" VARCHAR(200) NOT NULL UNIQUE,
    "state" JSONB DEFAULT '{}',
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "emailVerified" boolean not null default false,
    "image" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create server table
CREATE TABLE "server" (
    "id" VARCHAR PRIMARY KEY,
    "name" VARCHAR(200) NOT NULL,
    "ownerId" VARCHAR REFERENCES "user"(id),
    "description" TEXT,
    "icon" VARCHAR(255),
    "updatedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create serverMember junction table (for many-to-many relationship between servers and users)
CREATE TABLE "serverMember" (
    "serverId" VARCHAR REFERENCES "server"(id),
    "userId" VARCHAR REFERENCES "user"(id),
    "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("serverId", "userId")
);

-- Create channel table
CREATE TABLE "channel" (
    "id" VARCHAR PRIMARY KEY,
    "serverId" VARCHAR REFERENCES "server"(id),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "private" BOOLEAN DEFAULT FALSE,
    "updatedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create thread table
CREATE TABLE "thread" (
    "id" VARCHAR PRIMARY KEY,
    "channelId" VARCHAR REFERENCES "channel"(id),
    "creatorId" VARCHAR REFERENCES "user"(id),
    "title" VARCHAR(200),
    "description" VARCHAR(200),
    "updatedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create message table
CREATE TABLE "message" (
    "id" VARCHAR PRIMARY KEY,
    "serverId" VARCHAR REFERENCES "server"(id),
    "channelId" VARCHAR REFERENCES "channel"(id),
    "threadId" VARCHAR REFERENCES "thread"(id) NULL,
    "senderId" VARCHAR REFERENCES "user"(id),
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP NULL,
    "deleted" BOOLEAN DEFAULT FALSE
);

-- better-auth:

create table "session" (
    "id" text not null primary key,
    "expiresAt" timestamp not null,
    "token" text not null unique,
    "createdAt" timestamp not null,
    "updatedAt" timestamp not null,
    "ipAddress" text,
    "userAgent" text,
    "userId" text not null references "user" ("id")
);

create table "account" (
    "id" text not null primary key,
    "accountId" text not null,
    "providerId" text not null,
    "userId" text not null references "user" ("id"),
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp,
    "refreshTokenExpiresAt" timestamp,
    "scope" text,
    "password" text,
    "createdAt" timestamp not null,
    "updatedAt" timestamp not null
);

create table "verification" (
    "id" text not null primary key,
    "identifier" text not null,
    "value" text not null,
    "expiresAt" timestamp not null,
    "createdAt" timestamp,
    "updatedAt" timestamp
)

create table "jwks" (
    "id" text NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp without time zone NOT NULL
)
