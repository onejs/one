# One starter

The default One v2 starter brings Takeout's auth, synced todos, themes, and
shared web and native components into the One repository. It uses One v2 beta,
Tamagui v3 beta, Zero, Better Auth, and Drizzle.

## Run

Install Bun and Node 24.3 or newer, then run:

```sh
bun install
bun backend
```

In a second terminal:

```sh
bun dev
```

Open http://localhost:8081. Use the demo login to try the synced todo list.
The backend runs Postgres and Zero locally through Orez, without Docker.
Keep both terminals running while developing.

## Native

On macOS, install Xcode and CocoaPods, then run `bun ios` while `bun dev` is
running. For Android, install Android Studio and a JDK, then run `bun android`.
Run `bun prebuild:native` once to create the native projects from
`native.app` in `vite.config.ts`.
The app name, bundle identifiers, and linking scheme derive from the package name in
`appIdentity.ts`. Edit that file and the icons in `vite.config.ts` before shipping. Generated `ios/` and `android/` directories are ignored.

`bun dev` runs One for web and Metro for native. Native storage and crypto use One, and Zero persists through OP-SQLite.
The Metro Babel preset is included; the app does not require Expo.

## Work on the app

- `app/`: routes, auth screens, todos, and settings.
- `src/features/`: authentication, todo behavior, and platform storage.
- `src/interface/`: shared UI, plus native keyboard and toast implementations.
- `src/tamagui/`: config, CSS animations on web, Reanimated on native, and themes.
- `src/database/`: private auth tables, public synced tables, and migrations.
- `src/data/` and `src/zero/`: Zero models, permissions, queries, and clients.

Run `bun check` for types and lint, `bun format` to format, and `bun build`
then `bun serve` for the production web app. After changing a database schema,
run `bun migrate`. After changing Zero models or queries, run
`bun zero:generate` and commit the generated output.

## Configure

`.env.development` contains local defaults and a development-only auth secret.
For deployment, configure a new `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`ONE_SERVER_URL`, `VITE_ZERO_URL`, and the three database URLs in your hosting
environment. Point Zero's mutate/query endpoints at your deployed API routes.
Disable `VITE_DEMO_MODE` and remove the demo-user migration for production.
Local backend state lives in `.orez/`.

The starter preserves Takeout Free's MIT license in `LICENSE`. The default
source is `templates/one-starter` in One; changes to it should be made there.
