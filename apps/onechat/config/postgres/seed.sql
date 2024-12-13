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

CREATE TABLE "friendship" (
    "requestingId" VARCHAR REFERENCES "user"(id),
    "acceptingId" VARCHAR REFERENCES "user"(id),
    "accepted" BOOLEAN not null default false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("requestingId", "acceptingId")
);

CREATE TABLE "server" (
    "id" VARCHAR PRIMARY KEY,
    "name" VARCHAR(200) NOT NULL,
    "ownerId" VARCHAR REFERENCES "user"(id),
    "description" TEXT,
    "icon" VARCHAR(255),
    "updatedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "serverMember" (
    "serverId" VARCHAR REFERENCES "server"(id),
    "userId" VARCHAR REFERENCES "user"(id),
    "hasClosedWelcome" BOOLEAN DEFAULT FALSE NOT NULL,
    "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("serverId", "userId")
);

CREATE TABLE "channel" (
    "id" VARCHAR PRIMARY KEY,
    "serverId" VARCHAR REFERENCES "server"(id),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "private" BOOLEAN DEFAULT FALSE NOT NULL,
    "updatedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "thread" (
    "id" VARCHAR PRIMARY KEY,
    "channelId" VARCHAR REFERENCES "channel"(id),
    "messageId" VARCHAR,
    "creatorId" VARCHAR REFERENCES "user"(id),
    "title" VARCHAR(200),
    "description" VARCHAR(200),
    "updatedAt" TIMESTAMP NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "message" (
    "id" VARCHAR PRIMARY KEY,
    "serverId" VARCHAR REFERENCES "server"(id),
    "channelId" VARCHAR REFERENCES "channel"(id),
    "threadId" VARCHAR REFERENCES "thread"(id) NULL,
    "senderId" VARCHAR REFERENCES "user"(id),
    "content" TEXT NOT NULL,
    "isThreadReply" BOOLEAN DEFAULT FALSE NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NULL,
    "deleted" BOOLEAN DEFAULT FALSE NOT NULL
);

ALTER TABLE
    "thread"
ADD
    CONSTRAINT "fk_thread_message" FOREIGN KEY ("messageId") REFERENCES "message" ("id");

CREATE TABLE "reaction" (
    "id" VARCHAR PRIMARY KEY,
    "value" VARCHAR UNIQUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NULL
);

CREATE TABLE "messageReaction" (
    "messageId" VARCHAR REFERENCES "message"(id),
    "userId" VARCHAR REFERENCES "user"(id),
    "reactionId" VARCHAR REFERENCES "reaction"(id),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NULL,
    PRIMARY KEY ("messageId", "userId", "reactionId")
);

-- better-auth:
create table "session" (
    id text NOT NULL PRIMARY KEY,
    "expiresAt" timestamp without time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp without time zone NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL references "user"(id)
);

create table "account" (
    id text NOT NULL PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL references "user"(id),
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp without time zone,
    "refreshTokenExpiresAt" timestamp without time zone,
    scope text,
    password text,
    "createdAt" timestamp without time zone NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL
);

create table "verification" (
    id text NOT NULL PRIMARY KEY,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    "createdAt" timestamp without time zone,
    "updatedAt" timestamp without time zone
);

create table "jwks" (
    "id" text NOT NULL PRIMARY KEY,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp without time zone NOT NULL
);

--- seed data:
-- test user
INSERT INTO
    "user" (
        "id",
        "username",
        "name",
        "email",
        "state",
        "emailVerified",
        "image",
        "createdAt",
        "updatedAt"
    )
VALUES
    (
        'test-user-id',
        'testuser',
        'Test User',
        'testuser@example.com',
        '{}',
        true,
        'https://one1.dev/onechatimages/uploads/np424wtl8z-avatar.png',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- test server
INSERT INTO
    "server" (
        "id",
        "name",
        "ownerId",
        "description",
        "icon",
        "createdAt",
        "updatedAt"
    )
VALUES
    (
        'test-server-id',
        'Test Server',
        'test-user-id',
        'This is a test server.',
        'https://one1.dev/onechatimages/uploads/np424wtl8z-avatar.png',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Insert a default channel for the server
INSERT INTO "channel" ("id", "serverId", "name", "description", "private", "createdAt", "updatedAt")
VALUES ('test-channel-id', 'test-server-id', 'general', 'This is a default channel.', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add the user to the server
INSERT INTO
    "serverMember" (
        "serverId",
        "userId",
        "hasClosedWelcome",
        "joinedAt"
    )
VALUES
    (
        'test-server-id',
        'test-user-id',
        false,
        CURRENT_TIMESTAMP
    );
