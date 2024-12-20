CREATE DATABASE onezero;
CREATE DATABASE onezero_cvr;
CREATE DATABASE onezero_cdb;

\c onezero;

-- example tables:

CREATE TABLE "user" (
    "id" VARCHAR PRIMARY KEY,
    "username" VARCHAR(200),
    "name" VARCHAR(200),
    "email" VARCHAR(200) NOT NULL UNIQUE,
    "state" JSONB DEFAULT '{}',
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "emailVerified" boolean not null default false,
    "image" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "message" (
    "id" VARCHAR PRIMARY KEY,
    "senderId" VARCHAR REFERENCES "user"(id),
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NULL
);

-- better-auth tables:

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
