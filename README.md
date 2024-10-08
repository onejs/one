# One - A Full Stack Cross Platform Framework

One is a powerful and versatile React framework designed to make full-stack development seamless, allowing you to target both React Native and web with a single codebase. Built with Vite, One offers fast compilation, tree-shaking, and modern syntax support, allowing developers to build websites, mobile apps, or cross-platform applications effortlessly.

## Features

- **Unified Targeting**: Write once, run on React Native and Web.
- **File System Routing**: Use a familiar file-based routing approach.
- **Flexible Routing Modes**: SSG, SSR, SPA, and API on a per-page basis.
- **Zero Config**: Vite config optimized for React Native and web with ultra-fast builds.
- **Integrated Loaders**: With client-side tree shaking.
- **Preloaded JS**: Preloads all JS for the initial load and link hover for faster navigation.

## Getting Started

### Installation

Setting up One is a breeze. Use the following command to get started with one of our starter templates:

```bash
npx one
```

The CLI will guide you through the process of bootstrapping a new app. Choose from bare-bones examples to full-stack solutions with authentication systems. We are launching more starter templates as the project matures.

### 5-Minute Tutorial

Want to build a basic app from scratch? Here's a quick guide:

1. Initialize the project with `npx one` and choose your template.
2. Create the following `package.json`:

```json
{
  "name": "one-app",
  "version": "0.0.0",
  "type": "module",
  "sideEffects": false,
  "scripts": {
    "dev": "one dev",
    "build": "one build",
    "serve": "one serve"
  },
  "dependencies": {
    "expo": "~51.0.28",
    "one": "latest",
    "react": "^18.3.1",
    "react-native": "^0.74.1",
    "react-native-web": "^0.19.12"
  },
  "devDependencies": {
    "vite": "6.0.0-beta.1"
  }
}
```

3. Pin the `one` version for production stability:

```bash
npm install one@latest --save-exact
```

### Vite Config

Add this `vite.config.ts` for a minimal setup:

```typescript
// Typed as UserConfig for handy autocomplete
import type { UserConfig } from 'vite';
import { one } from 'one/vite';

export default {
  plugins: [one()],
} satisfies UserConfig;
```

### TSConfig

One will create a `tsconfig.json` automatically when you start the dev server, with defaults suited to both web and native environments.

### File System Routing

One expects routes to be placed in an `app` directory. For example:

- `app/_layout.tsx`: This serves as the top-level wrapper for all routes.
- `app/index.tsx`: The root component of your app.

Here's an example `app/_layout.tsx`:

```tsx
import { Slot } from 'one';

export default function Layout() {
  return <Slot />;
}
```

And a simple `app/index.tsx`:

```tsx
import { View, Text } from "react-native";

export default function MyApp() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <Text>Hello from One</Text>
    </View>
  );
}
```

### Running Your App

To start the app, install the dependencies and run the dev server:

```bash
npm install && npm run dev
```

- Open your browser at [http://localhost:8081](http://localhost:8081).
- For native development, you can use an Expo Go development app and load your app with exp://0.0.0.0:8081. Press the key combination q, r in your terminal which is running the dev server, and scan the QR code with your iPhone's camera if your computer and iPhone are connected to the same WiFi network.

---

## Hooks

One comes with several custom hooks to simplify state management and routing, including `useLoaderData`, `useNavigate`, and more.

## CLI

The One CLI tool offers various commands, such as:

- **`one dev`**: Start the development server.
- **`one build`**: Build your app for production.
- **`one serve`**: Serve the built app.

## Data Layer

One comes with a built-in solution for data management, including local-first libraries for handling complex state and schema.

## Layout

Use `app/_layout.tsx` for global layouts, and the `<Slot />` component for nested layouts.

## Acknowledgements

One was built with contributions from various open-source libraries and frameworks, including:

- [**React Navigation**](https://reactnavigation.org/) for routing.
- [**Expo Router**](https://docs.expo.dev/router/introduction) for initial routing concepts.
- [**Software Mansion**](https://swmansion.com/) for React Native Screens and React Native Gesture Handler.
- [**Remix**](https://remix.run/) for inspiration for the loader APIs.
- [**Vite**](https://vitejs.dev/) for its blazing fast builds.

And a special thanks to the following individuals:

- [**Matias Capeletto**](https://x.com/patak_dev) for inviting us to speak at ViteConf, giving the initial spark.
- [**Fatih Aygün**](https://github.com/cyco130) for freely helping at length, getting us past many hurdles.
- [**Hiroshi Ogawa**](https://github.com/hi-ogawa) for his expert consulting for which One wouldn't exist without.
- **Dan Maier**, for graciously gifting us the one npm package.

---

## Quick Navigation

- [5-Minute Tutorial](#5-minute-tutorial)
- [Vite Config](#vite-config)
- [File System Routes](#file-system-routing)
- [Running Your App](#running-your-app)

---

This Readme is still being worked upon.
We'll get this filled out properly soon.

**[See our documentation website](https://onestack.dev)** for more.
