One Basic runs on web, iOS, and Android with React Native.

When working in the One repository, install its Bun workspace from the repository
root, then start this example:

```bash
bun install --frozen-lockfile
bun run build
cd examples/one-basic
bun run dev
```

Use `bun run` for the native commands below in this workspace. The npm commands
are for a standalone app created with `npx one`, which replaces workspace
dependencies with the published One version:

```bash
npm install
npm run dev
```

Open the URL printed by the server for web. For native, keep the server running
and build the app in another terminal; the first run generates the native
project:

```bash
npm run ios
```

For Android, use `npm run android`. iOS requires
macOS, Xcode, and CocoaPods; Android requires the Android SDK and JDK 17.

Set your bundle ID and application ID in `native.app` in `vite.config.ts`.
Run `npm run prebuild:native` and rebuild after changing native configuration
or adding native dependencies. JavaScript changes use hot reload.

The [native setup guide](https://onestack.dev/docs/native-setup) covers permissions
and adding One Native controls. The
[platform support table](https://onestack.dev/native/platform-support) lists
which services and components each platform supports.
