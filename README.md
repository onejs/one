# One

<div align="center">
  <h1>🎯 One</h1>
  <p><strong>A React framework for web and native, built on Vite</strong></p>
  
  <p>
    <a href="https://onestack.dev"><strong>Documentation</strong></a> ·
    <a href="#quick-start"><strong>Quick Start</strong></a> ·
    <a href="#examples"><strong>Examples</strong></a> ·
    <a href="https://github.com/onejs/one/discussions"><strong>Community</strong></a>
  </p>

  <p>
    <img src="https://img.shields.io/npm/v/one?style=flat&colorA=black&colorB=black" alt="Version">
    <img src="https://img.shields.io/npm/dm/one?style=flat&colorA=black&colorB=black" alt="Downloads">
    <img src="https://img.shields.io/github/license/onejs/one?style=flat&colorA=black&colorB=black" alt="License">
  </p>
</div>

---

## What is One?

One is a React framework that simplifies full-stack development by unifying web and native development in a single codebase. Built on [Vite](https://vitejs.dev), One replaces both Metro and separate web frameworks with a unified solution featuring shared file-system routing.

## ✨ Key Features

- 🎯 **Universal**: Target both React Native and web with one codebase
- ⚡ **Fast**: Built on Vite for lightning-fast development and builds
- 📁 **File-System Routing**: Automatic routing based on your file structure
- 🔄 **Multiple Render Modes**: SSG, SSR, SPA, and API routes on a per-page basis
- 📦 **Smart Loading**: Tree-shakeable loaders inspired by Remix
- 🔥 **Hot Reload**: Fast refresh for both web and native
- 🚀 **Production Ready**: Includes a production server out of the box
- ⚙️ **Flexible**: Works with Metro (recommended) or experimental Vite bundler for native

## 🚀 Quick Start

Get started in seconds with our CLI:

```bash
npx one
```

This will create a new One project with everything set up and ready to go.

### Manual Installation

```bash
npm install one
# or
yarn add one
# or
pnpm add one
```

## 📋 Basic Usage

Create your first route:

```tsx
// app/index.tsx
import { Text } from 'react-native'

export default function HomePage() {
  return <Text>Hello, One! 👋</Text>
}
```

For web-only features, use HTML elements:

```tsx
// app/about.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Built with One framework</p>
    </div>
  )
}
```

### Adding Loaders

Fetch data with tree-shakeable loaders:

```tsx
// app/blog/[slug].tsx
import { createLoader } from 'one'

export const loader = createLoader(async (params) => {
  const post = await getPost(params.slug)
  return { post }
})

export default function BlogPost() {
  const { post } = loader.useData()
  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  )
}
```

### Nested Layouts

Create shared layouts with `_layout.tsx`:

```tsx
// app/_layout.tsx
import { Slot } from 'one'

export default function RootLayout() {
  return (
    <div>
      <nav>My App</nav>
      <Slot /> {/* Child routes render here */}
    </div>
  )
}
```

## 🏗️ Development

```bash
# Install dependencies
yarn

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

Your app will be available at:
- **Web**: http://localhost:8081
- **Native**: Use Expo Go or development build with the same URL

## 📚 Examples

Check out our example projects:

- [**Basic**](examples/one-basic) - Simple starter
- [**Recommended**](examples/one-recommended) - Full-featured setup with database
- [**Tailwind**](examples/one-tailwind) - Using Tailwind CSS
- [**Tamagui**](examples/one-tamagui) - Using Tamagui for styling
- [**Zero**](examples/one-zero) - With Zero for real-time data sync

## 🏛️ Monorepo Structure

```
packages/
├── one/                    # Main framework package & Vite plugin
├── vxrn/                   # Vite plugin for React Native support
├── vite-plugin-metro/      # Alternative Vite plugin for React Native
├── create-vxrn/           # CLI scaffolding tool (`npx one`)
└── [other packages]/       # Various utilities and plugins

apps/
├── onestack.dev/          # Documentation website
└── devtools/              # Development tools

examples/                  # Template projects and demos
tests/                    # Test suite and test utilities
```

## 📖 Documentation

For comprehensive guides, API references, and examples:

**[📘 Visit our documentation website →](https://onestack.dev)**

Key documentation sections:
- [Getting Started](https://onestack.dev/docs/installation)
- [Routing](https://onestack.dev/docs/routing) 
- [Loaders](https://onestack.dev/docs/routing-loader)
- [Render Modes](https://onestack.dev/docs/routing-modes)
- [Configuration](https://onestack.dev/docs/configuration)
- [Deployment](https://onestack.dev/docs/guides-deploying)

## 🤝 Contributing

We welcome contributions! Here's how to get started:

```bash
# Clone the repository
git clone https://github.com/onejs/one.git
cd one

# Install dependencies
yarn

# Build packages
yarn build

# Run tests
yarn test

# Start development mode
yarn watch
```

Please see our [GitHub Issues](https://github.com/onejs/one/issues) and [Discussions](https://github.com/onejs/one/discussions) for more details on contributing.

## 🌟 Use Cases

One works exceptionally well for:

- **Cross-platform Apps**: Ship to web and native with shared code
- **Fast Prototyping**: Quickly build and iterate on full-stack applications  
- **Performance-Critical Apps**: Benefit from Vite's speed and optimization
- **Modern Web Apps**: Take advantage of the latest React and web technologies

## 🗺️ Status & Roadmap

One is in active development and used in production by several projects. While the core features are stable, we're continuously improving and adding new capabilities.

**Current Status**: Beta
**Stability**: Core routing and building features are stable
**Production Ready**: Yes, with proper testing

See our [GitHub Discussions](https://github.com/onejs/one/discussions) for roadmap updates and feature requests.

## 🙏 Acknowledgements

One was built on the shoulders of giants and couldn't exist without:

- [**React Navigation**](https://reactnavigation.org) - Base routing library
- [**Expo Router**](https://docs.expo.dev/router/introduction) - Initial routing inspiration
- [**Vite**](https://vitejs.dev) - The foundation that makes it all possible
- [**Remix**](https://remix.run) - Loader API inspiration
- [**Software Mansion**](https://swmansion.com) - React Native Screens and Gesture Handler

Special thanks to:
- [Matias Capeletto](https://x.com/patak_dev) for the ViteConf opportunity
- [Fatih Aygün](https://github.com/cyco130) for extensive help and guidance
- [Hiroshi Ogawa](https://github.com/hi-ogawa) for expert consulting
- Dan Maier for graciously gifting us the `one` npm package

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built with ❤️ by the One team</p>
  <p>
    <a href="https://onestack.dev">Documentation</a> ·
    <a href="https://github.com/onejs/one/discussions">Discussions</a> ·
    <a href="https://x.com/natebirdman">Twitter</a>
  </p>
</div>
