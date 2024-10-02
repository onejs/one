# One Project

Welcome to One!

## Setup

Set up your `.env` file first:

```bash
cp .env.default .env
```

Now you'll need to run a postgres database. We've included a `docker-compose.yml`
that will set up everything for you, you'll want to set up docker first though:

- On Mac, we highly recommend [OrbStack](https://orbstack.dev) as it's much faster and generally a drop-in replacement.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) works otherwise.

Once you do install one of those and run it, you should be able to run:

```bash
docker-compose up
```

And have your database come online.

Ensure your `DATABASE_URL` set in a .env file and points to a running Postgres database and then run your database migrations and seeding:

```bash
yarn db:init
```

## Developing

You can now run your One app in development:

```bash
yarn dev
```

## Production

To build your app for production:

### Web

```bash
yarn build:web
```

### iOS

First, you'll need to generate the native code for your app:

```bash
yarn prebuild:native
```

Afterward, follow the instructions printed in the terminal to build and upload your iOS app for distribution.
