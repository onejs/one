## Database Setup

Welcome!

## Database Setup

You will need a DATABASE_URL set in a .env file which points to a Postgres database.

## Generate Schemas

This repo includes the initial migrations, but you will need to run `yarn orm:generate` to generate the drizzle-orm schema.

## Run Migrations

This repo includes the initial migrations, but you will need to run `yarn orm:migrate` to run the migrations against your `DATABASE_URL`.

## Optional Seeding

To get a feel for the app, you can seed it with a bunch of lorem ipsum data, run `yarn orm:seed` to seed the database for the app.
Ensure `DATABASE_URL` set in a .env file and points to a Postgres database.

Then you:

```bash
yarn orm:generate
yarn orm:push
yarn org:seed
```
