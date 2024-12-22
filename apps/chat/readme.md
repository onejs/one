# Setup

Install the repo deps:

```sh
yarn
```

Move config:

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
