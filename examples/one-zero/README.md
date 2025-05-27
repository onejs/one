# One Zero

## Install

Install packages with yarn:

```sh
yarn install
```

For login, we have set up Github auth with [Better Auth](https://www.better-auth.com/) as an example.

1. [Create a new Github App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app#registering-a-github-app) at https://github.com/settings/apps.
  * For local development, add a Callback URL like `http://localhost:8081/api/auth/callback/github` under the "Identifying and authorizing users" section.
2. Copy `.env.example` to `.env` (`cp .env.example .env`).
3. Fill in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

## Run

> Before you start, make sure you have Docker running on your machine.
> If you haven't set up Docker yet, we recommend using [OrbStack](https://orbstack.dev/) on macOS.

In three separate terminal tabs, run:

```bash
yarn docker up
yarn zero
yarn dev
```

To run tauri, you can run this instead of `yarn dev`:

```bash
yarn dev:tauri
```

To reset all your data:

```bash
yarn docker:start:clean
```

## Tauri

If you'd like to build a desktop app you may want to use Tauri. You can remove it if you don't need it.

Getting Tauri to handle auth in a sane way takes a bit of work, but we've set up most of it here for you. If you're using OAuth, you don't want to force your users to login via the Tauri window, as they will lack all saved credentials and be forced to memorize their password / not use passkeys, etc.

So instead we open the login link using target="_blank" so it opens in their default browser, making for a smooth login experience. But that means you need to pass back the credentials to Tauri once logged in.

To do this, we added the deep-link plugin to Tauri, allowing for `one-zero://domain` style URLs to open with your native Tauri app. This allows for really nice hand-off.

On Mac though, you can't use deep links in dev mode. So you'll need to make a production build, drag it to your Applications folder, and run your app from there. We set up the production build to hit your same development server for now, so you can actually just use that built app as your main dev driver. It includes dev tools as you'd normally want, too. Once you set this up development is easy, and login has great UX.

## Troubleshooting

### Zero Server

* **`Failed to decode auth token` or `Failed to parse the JSON Web Key Set HTTP response as JSON`**: Make sure your web server (`yarn dev`) is running, and that you have the correct `ZERO_AUTH_JWKS_URL` set in your `.env` file.
