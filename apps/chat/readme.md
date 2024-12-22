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

Start your [Docker app](https://orbstack.dev).

Then, in three separate tabs run:

```
yarn docker:start:clean
yarn zero
yarn dev
```
