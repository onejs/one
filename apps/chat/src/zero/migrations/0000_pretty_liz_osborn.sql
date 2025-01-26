CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"messageId" text,
	"channelId" text,
	"type" text NOT NULL,
	"data" text,
	"url" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel" (
	"id" text PRIMARY KEY NOT NULL,
	"serverId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"private" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channelPermission" (
	"id" text PRIMARY KEY NOT NULL,
	"serverId" text NOT NULL,
	"channelId" text NOT NULL,
	"roleId" text NOT NULL,
	"granterId" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "friendship" (
	"requestingId" text NOT NULL,
	"acceptingId" text NOT NULL,
	"accepted" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "friendship_requestingId_acceptingId_pk" PRIMARY KEY("requestingId","acceptingId")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"serverId" text NOT NULL,
	"channelId" text NOT NULL,
	"threadId" text,
	"creatorId" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	"deleted" boolean,
	"isThreadReply" boolean DEFAULT false NOT NULL,
	"replyingToId" text
);
--> statement-breakpoint
CREATE TABLE "messageReaction" (
	"messageId" text NOT NULL,
	"creatorId" text NOT NULL,
	"reactionId" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "messageReaction_messageId_creatorId_reactionId_pk" PRIMARY KEY("messageId","creatorId","reactionId")
);
--> statement-breakpoint
CREATE TABLE "pin" (
	"id" text PRIMARY KEY NOT NULL,
	"serverId" text NOT NULL,
	"channelId" text NOT NULL,
	"messageId" text NOT NULL,
	"creatorId" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reaction" (
	"id" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"keyword" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"serverId" text NOT NULL,
	"creatorId" text NOT NULL,
	"canAdmin" boolean,
	"canEditChannel" boolean,
	"canEditServer" boolean,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "server" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creatorId" text NOT NULL,
	"channelSort" json,
	"description" text,
	"icon" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "serverMember" (
	"serverId" text NOT NULL,
	"userId" text NOT NULL,
	"joinedAt" timestamp DEFAULT now(),
	CONSTRAINT "serverMember_serverId_userId_pk" PRIMARY KEY("serverId","userId")
);
--> statement-breakpoint
CREATE TABLE "thread" (
	"id" text PRIMARY KEY NOT NULL,
	"channelId" text NOT NULL,
	"creatorId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"deleted" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"state" json,
	"updatedAt" timestamp DEFAULT now(),
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "userRole" (
	"serverId" text NOT NULL,
	"userId" text NOT NULL,
	"roleId" text NOT NULL,
	"granterId" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "userRole_serverId_userId_roleId_pk" PRIMARY KEY("serverId","userId","roleId")
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_messageId_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_channelId_channel_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_serverId_server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channelPermission" ADD CONSTRAINT "channelPermission_serverId_server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channelPermission" ADD CONSTRAINT "channelPermission_channelId_channel_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channelPermission" ADD CONSTRAINT "channelPermission_roleId_role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channelPermission" ADD CONSTRAINT "channelPermission_granterId_user_id_fk" FOREIGN KEY ("granterId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_requestingId_user_id_fk" FOREIGN KEY ("requestingId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_acceptingId_user_id_fk" FOREIGN KEY ("acceptingId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_serverId_server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_channelId_channel_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_threadId_thread_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."thread"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_creatorId_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_replyingToId_message_id_fk" FOREIGN KEY ("replyingToId") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messageReaction" ADD CONSTRAINT "messageReaction_messageId_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messageReaction" ADD CONSTRAINT "messageReaction_creatorId_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messageReaction" ADD CONSTRAINT "messageReaction_reactionId_reaction_id_fk" FOREIGN KEY ("reactionId") REFERENCES "public"."reaction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin" ADD CONSTRAINT "pin_serverId_server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin" ADD CONSTRAINT "pin_channelId_channel_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin" ADD CONSTRAINT "pin_messageId_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pin" ADD CONSTRAINT "pin_creatorId_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_serverId_server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_creatorId_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server" ADD CONSTRAINT "server_creatorId_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serverMember" ADD CONSTRAINT "serverMember_serverId_server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serverMember" ADD CONSTRAINT "serverMember_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread" ADD CONSTRAINT "thread_channelId_channel_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread" ADD CONSTRAINT "thread_creatorId_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userRole" ADD CONSTRAINT "userRole_serverId_server_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."server"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userRole" ADD CONSTRAINT "userRole_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userRole" ADD CONSTRAINT "userRole_roleId_role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userRole" ADD CONSTRAINT "userRole_granterId_user_id_fk" FOREIGN KEY ("granterId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;