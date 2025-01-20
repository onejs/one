# Setup

At the root of this repo install and build:

```sh
yarn
yarn build
```

In this folder set up env:

```sh
cp .env.example .env
```

Start [Docker](https://orbstack.dev).

Then, in separate tabs run:

```bash
yarn backend
yarn db:migrate # this will also seed the db
yarn zero
yarn dev
```
