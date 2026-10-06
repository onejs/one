One Basic runs on web, iOS, and Android with React Native.

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open the URL printed by the server for web. For native, keep the server running
and generate the native project in another terminal:

```bash
npm run prebuild:native -- --platform ios
npm run ios
```

For Android, use `--platform android` and `npm run android`. iOS requires
macOS, Xcode, and CocoaPods; Android requires the Android SDK and JDK 17.

Set your bundle ID and application ID in `native.app` in `vite.config.ts`.
Regenerate and rebuild after changing native configuration or adding native
dependencies. JavaScript changes use hot reload.

The [native setup guide](https://onestack.dev/docs/native-setup) covers permissions,
Expo integration, and adding One Native controls. The
[platform support table](https://onestack.dev/native/platform-support) lists
which services and components each platform supports.
