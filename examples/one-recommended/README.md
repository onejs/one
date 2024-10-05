# One Project

Welcome to One!

## Setup

Now you'll need to run a postgres database. We've included a
`docker-compose.yml` that will set up everything for you.

You'll want to set up docker first:

- On Mac, we recommend [OrbStack](https://orbstack.dev) as it's faster.
- Otherwise [Docker Desktop](https://www.docker.com/products/docker-desktop/).

Now run:

```bash
docker-compose up
```

Set up your DB:

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

Afterward, follow the instructions printed in the terminal to build and upload
your iOS app for distribution.
