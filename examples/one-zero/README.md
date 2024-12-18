# Install

Install packages with yarn:

```sh
yarn
```

For login, we have set up Github auth with [Better Auth](https://www.better-auth.com/) as an example.

1. [Create a new Github App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app#registering-a-github-app)
2. Copy `.env.example` to `.env`
3. Fill in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

# Run

in three separate tabs:

```
yarn docker up
yarn zero
yarn dev
```

to run tauri you can run this instead of `yarn dev`:

```
yarn dev:tauri
```

to reset all your data:

```
yarn docker:start:clean
```
